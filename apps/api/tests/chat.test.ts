import { beforeEach, describe, expect, it } from "bun:test";
import { InMemoryVectorStore, MockChatModel, MockEmbeddingModel, reindexCatalog } from "@avelor/ai";
import { InMemoryCatalogRepository, parseTenantId } from "@avelor/core";
import { createApp } from "../src/app";

describe("AI Chat HTTP API Endpoints", () => {
  let app: ReturnType<typeof createApp>;
  let repo: InMemoryCatalogRepository;
  let model: MockChatModel;
  let embeddingModel: MockEmbeddingModel;
  let vectorStore: InMemoryVectorStore;

  const tenantA = "store_alpha";
  const tenantB = "store_beta";

  beforeEach(async () => {
    repo = new InMemoryCatalogRepository();
    model = new MockChatModel();
    embeddingModel = new MockEmbeddingModel(64);
    vectorStore = new InMemoryVectorStore();

    app = createApp({
      catalogRepo: repo,
      chatModel: model,
      embeddingModel,
      vectorStore,
    });

    // Seed product for Tenant A
    await repo.createProduct({
      tenantId: parseTenantId(tenantA),
      name: "Organic Cold Brew Blend",
      description: "Coarse ground dark roast coffee beans for cold brewing",
      status: "active",
      categories: ["coffee"],
    });

    // Seed an outerwear item with NO keyword overlap to "rainy storm"
    await repo.createProduct({
      tenantId: parseTenantId(tenantA),
      name: "Alpine Gore-Tex Technical Shell",
      description: "Waterproof protective coat engineered for heavy mountain downpours",
      status: "active",
      categories: ["outerwear"],
    });

    // Reindex catalog into vector store
    await reindexCatalog({
      tenantId: parseTenantId(tenantA),
      catalogRepo: repo,
      embeddingModel,
      vectorStore,
    });
  });

  it("rejects chat requests without x-tenant-id", async () => {
    const res = await app.request("/api/v1/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TENANT_ID");
  });

  it("rejects empty message body", async () => {
    const res = await app.request("/api/v1/chat", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: "" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("executes grounded product discovery via POST /api/v1/chat", async () => {
    const res = await app.request("/api/v1/chat", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "I am looking for coffee",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toContain("Organic Cold Brew Blend");
    expect(Array.isArray(body.toolCalls)).toBe(true);
    expect(body.toolCalls.length).toBeGreaterThan(0);
    expect(body.toolCalls[0].name).toBe("search_products");
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products[0].name).toBe("Organic Cold Brew Blend");
  });

  it("does not leak internal model messages or the system prompt", async () => {
    const res = await app.request("/api/v1/chat", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "I am looking for coffee",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("system");
  });

  it("executes hybrid semantic search when customer uses conceptual phrasing", async () => {
    const res = await app.request("/api/v1/chat", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "search for rainy storm gear",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toContain("Alpine Gore-Tex Technical Shell");
  });

  it("enforces tenant boundaries during chat discovery", async () => {
    // Tenant B searches for coffee
    const res = await app.request("/api/v1/chat", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantB,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "I am looking for coffee",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // Must NOT reveal Tenant A's cold brew blend
    expect(body.reply).not.toContain("Organic Cold Brew Blend");
    expect(body.reply).toContain("couldn't find any products");
  });

  it("persists conversations, lists recent sessions, and restores message history", async () => {
    // 1. Initial user turn without conversationId
    const firstRes = await app.request("/api/v1/chat", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "I am looking for coffee",
      }),
    });

    expect(firstRes.status).toBe(200);
    const firstBody = await firstRes.json();
    expect(firstBody.conversationId).toBeDefined();
    expect(firstBody.conversationId).toMatch(/^conv_/);
    expect(firstBody.title).toBe("I am looking for coffee");
    const conversationId = firstBody.conversationId;

    // 2. List recent conversations
    const listRes = await app.request("/api/v1/chat/conversations", {
      headers: { "x-tenant-id": tenantA },
    });
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.conversations)).toBe(true);
    expect(listBody.conversations.length).toBe(1);
    expect(listBody.conversations[0].id).toBe(conversationId);
    expect(listBody.conversations[0].title).toBe("I am looking for coffee");

    // 3. Follow-up turn in the same conversation
    const followUpRes = await app.request("/api/v1/chat", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        message: "Tell me more about it",
      }),
    });

    expect(followUpRes.status).toBe(200);
    const followUpBody = await followUpRes.json();
    expect(followUpBody.conversationId).toBe(conversationId);

    // 4. Retrieve conversation messages
    const getRes = await app.request(`/api/v1/chat/conversations/${conversationId}`, {
      headers: { "x-tenant-id": tenantA },
    });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.conversation.id).toBe(conversationId);
    expect(getBody.conversation.messages.length).toBe(4); // 2 user + 2 assistant messages
    expect(getBody.conversation.messages[0].role).toBe("user");
    expect(getBody.conversation.messages[0].content).toBe("I am looking for coffee");
    expect(getBody.conversation.messages[1].role).toBe("assistant");
    expect(getBody.conversation.messages[1].products.length).toBeGreaterThan(0);
    expect(getBody.conversation.messages[2].role).toBe("user");
    expect(getBody.conversation.messages[2].content).toBe("Tell me more about it");
    expect(getBody.conversation.messages[3].role).toBe("assistant");

    // 5. Cross-tenant isolation on conversation access
    const crossTenantGet = await app.request(`/api/v1/chat/conversations/${conversationId}`, {
      headers: { "x-tenant-id": tenantB },
    });
    expect(crossTenantGet.status).toBe(404);

    // 6. Delete conversation
    const deleteRes = await app.request(`/api/v1/chat/conversations/${conversationId}`, {
      method: "DELETE",
      headers: { "x-tenant-id": tenantA },
    });
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);

    // 7. Verify deletion
    const verifyGet = await app.request(`/api/v1/chat/conversations/${conversationId}`, {
      headers: { "x-tenant-id": tenantA },
    });
    expect(verifyGet.status).toBe(404);
  });
});
