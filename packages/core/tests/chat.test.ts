import { describe, expect, it } from "bun:test";
import { deriveConversationTitle, InMemoryConversationRepository, parseTenantId } from "../src";

describe("deriveConversationTitle", () => {
  it("defaults to 'New Conversation' when prompt is blank", () => {
    expect(deriveConversationTitle("   ")).toBe("New Conversation");
    expect(deriveConversationTitle("")).toBe("New Conversation");
  });

  it("keeps concise titles intact", () => {
    expect(deriveConversationTitle("Show me running shoes")).toBe("Show me running shoes");
  });

  it("truncates long prompts at word boundaries with an ellipsis", () => {
    const longPrompt =
      "I am looking for comfortable running sneakers that have good arch support for marathons";
    const title = deriveConversationTitle(longPrompt);
    expect(title.length).toBeLessThanOrEqual(41); // up to 40 chars + ellipsis
    expect(title.endsWith("…")).toBe(true);
    expect(title).toBe("I am looking for comfortable running…");
  });
});

describe("InMemoryConversationRepository", () => {
  const tenantAlpha = parseTenantId("store_alpha");
  const tenantBeta = parseTenantId("store_beta");

  it("creates, retrieves, and isolates conversations by tenant", async () => {
    const repo = new InMemoryConversationRepository();

    const conv = await repo.createConversation({
      tenantId: tenantAlpha,
      title: "Running Shoes Search",
      userId: "user_123",
    });

    expect(conv.id).toMatch(/^conv_/);
    expect(conv.tenantId).toBe(tenantAlpha);
    expect(conv.title).toBe("Running Shoes Search");

    // Found in tenant Alpha
    const fetched = await repo.getConversation(tenantAlpha, conv.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(conv.id);
    expect(fetched?.messages).toEqual([]);

    // Cross-tenant isolation: not found in tenant Beta
    const crossTenant = await repo.getConversation(tenantBeta, conv.id);
    expect(crossTenant).toBeNull();
  });

  it("appends user and assistant messages and updates conversation timestamp", async () => {
    const repo = new InMemoryConversationRepository();

    const conv = await repo.createConversation({
      tenantId: tenantAlpha,
      title: "Audio gear",
    });

    const initialUpdatedAt = conv.updatedAt.getTime();

    // Small delay to ensure timestamp advancement
    await new Promise((resolve) => setTimeout(resolve, 5));

    const userMsg = await repo.appendMessage(tenantAlpha, {
      conversationId: conv.id,
      role: "user",
      content: "Do you have noise cancelling headphones?",
    });

    expect(userMsg.id).toMatch(/^msg_/);
    expect(userMsg.role).toBe("user");
    expect(userMsg.content).toBe("Do you have noise cancelling headphones?");

    const asstMsg = await repo.appendMessage(tenantAlpha, {
      conversationId: conv.id,
      role: "assistant",
      content: "Yes, here is the SonicPro ANC headphone.",
      products: [
        {
          id: "prod_headphones",
          name: "SonicPro ANC",
        },
      ],
    });

    expect(asstMsg.role).toBe("assistant");
    expect(asstMsg.products?.[0]?.id).toBe("prod_headphones");

    const full = await repo.getConversation(tenantAlpha, conv.id);
    expect(full?.messages.length).toBe(2);
    expect(full?.messages[0].role).toBe("user");
    expect(full?.messages[1].role).toBe("assistant");
    expect(full?.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt);
  });

  it("lists conversations ordered by latest activity with user filtering", async () => {
    const repo = new InMemoryConversationRepository();

    const c1 = await repo.createConversation({
      tenantId: tenantAlpha,
      title: "First thread",
      userId: "u1",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const c2 = await repo.createConversation({
      tenantId: tenantAlpha,
      title: "Second thread",
      userId: "u2",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Update c1 by appending a message
    await repo.appendMessage(tenantAlpha, {
      conversationId: c1.id,
      role: "user",
      content: "Bump thread 1",
    });

    const listAll = await repo.listConversations(tenantAlpha);
    expect(listAll.length).toBe(2);
    // c1 was updated latest, so it should be first
    expect(listAll[0].id).toBe(c1.id);
    expect(listAll[1].id).toBe(c2.id);

    // Filter by user
    const listU2 = await repo.listConversations(tenantAlpha, { userId: "u2" });
    expect(listU2.length).toBe(1);
    expect(listU2[0].id).toBe(c2.id);
  });

  it("updates conversation title and deletes conversation", async () => {
    const repo = new InMemoryConversationRepository();

    const conv = await repo.createConversation({
      tenantId: tenantAlpha,
      title: "Draft Title",
    });

    const updated = await repo.updateTitle(tenantAlpha, conv.id, "Renamed Title");
    expect(updated?.title).toBe("Renamed Title");

    // Deleting conversation
    const deleted = await repo.deleteConversation(tenantAlpha, conv.id);
    expect(deleted).toBe(true);

    const fetchedAfter = await repo.getConversation(tenantAlpha, conv.id);
    expect(fetchedAfter).toBeNull();

    // Deleting non-existent returns false
    const deleteAgain = await repo.deleteConversation(tenantAlpha, conv.id);
    expect(deleteAgain).toBe(false);
  });
});
