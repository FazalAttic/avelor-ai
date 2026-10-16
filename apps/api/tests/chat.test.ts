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
});
