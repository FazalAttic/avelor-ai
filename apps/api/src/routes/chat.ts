import {
  type ChatMessage,
  type ChatModel,
  DiscoveryAgent,
  type EmbeddingModel,
  type GuardrailEngine,
  type VectorStore,
} from "@avelor/ai";
import {
  type CatalogRepository,
  type ConversationRepository,
  deriveConversationTitle,
  type PolicyRepository,
  type ProductWithVariants,
  type StoredChatProduct,
} from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { requireTenant } from "../middleware/tenant";

interface ChatRequestBody {
  message: string;
  conversationId?: string | undefined;
  history?: readonly ChatMessage[] | undefined;
}

interface ToolResultPayload {
  products?: readonly { id?: unknown }[];
  product?: { id?: unknown } | null;
}

// Collect IDs of products referenced by catalog tool results so clients can
// render grounded product cards without receiving raw model/tool messages.
function extractProductIds(messages: readonly ChatMessage[]): string[] {
  const ids = new Set<string>();
  for (const message of messages) {
    if (
      message.role !== "tool" ||
      (message.name !== "search_products" && message.name !== "get_product_details")
    ) {
      continue;
    }
    try {
      const payload = JSON.parse(message.content) as ToolResultPayload;
      if (typeof payload.product?.id === "string") {
        ids.add(payload.product.id);
      }
      for (const product of payload.products ?? []) {
        if (typeof product.id === "string") {
          ids.add(product.id);
        }
      }
    } catch {
      // Tool output was not catalog JSON — nothing to extract
    }
  }
  return [...ids];
}

export interface ChatRoutesOptions {
  readonly embeddingModel?: EmbeddingModel | undefined;
  readonly vectorStore?: VectorStore | undefined;
  readonly policyRepo?: PolicyRepository | undefined;
  readonly guardrail?: GuardrailEngine | undefined;
  readonly conversationRepo?: ConversationRepository | undefined;
}

export function createChatRoutes(
  model: ChatModel,
  repo: CatalogRepository,
  options?: ChatRoutesOptions | undefined
) {
  const router = new Hono<AppEnv>();

  // Ensure every chat query is scoped by tenant identity
  router.use("*", requireTenant);

  // GET /conversations - List recent conversations for the current tenant
  router.get("/conversations", async (c) => {
    if (!options?.conversationRepo) {
      return c.json({ conversations: [] });
    }
    const tenantId = c.get("tenantId");
    const userId = c.get("user")?.id;
    const limitQuery = c.req.query("limit");
    const offsetQuery = c.req.query("offset");
    const limit = limitQuery
      ? Math.min(Math.max(Number.parseInt(limitQuery, 10) || 20, 1), 50)
      : 20;
    const offset = offsetQuery ? Math.max(Number.parseInt(offsetQuery, 10) || 0, 0) : 0;

    const conversations = await options.conversationRepo.listConversations(tenantId, {
      userId,
      limit,
      offset,
    });

    return c.json({ conversations });
  });

  // GET /conversations/:id - Fetch a conversation and its messages
  router.get("/conversations/:id", async (c) => {
    if (!options?.conversationRepo) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Conversation not found",
          },
        },
        404
      );
    }
    const tenantId = c.get("tenantId");
    const id = c.req.param("id");
    const conversation = await options.conversationRepo.getConversation(tenantId, id);
    if (!conversation) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Conversation not found",
          },
        },
        404
      );
    }
    return c.json({ conversation });
  });

  // DELETE /conversations/:id - Delete a conversation thread
  router.delete("/conversations/:id", async (c) => {
    if (!options?.conversationRepo) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Conversation not found",
          },
        },
        404
      );
    }
    const tenantId = c.get("tenantId");
    const id = c.req.param("id");
    const success = await options.conversationRepo.deleteConversation(tenantId, id);
    if (!success) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Conversation not found",
          },
        },
        404
      );
    }
    return c.json({ success: true });
  });

  // POST / - Send chat message with session orchestration and persistence
  router.post("/", async (c) => {
    const tenantId = c.get("tenantId");

    let body: ChatRequestBody;
    try {
      body = await c.req.json<ChatRequestBody>();
    } catch {
      return c.json(
        {
          error: {
            code: "INVALID_JSON",
            message: "Malformed JSON body",
          },
        },
        400
      );
    }

    if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Property 'message' must be a non-empty string",
          },
        },
        400
      );
    }

    const trimmedPrompt = body.message.trim();
    let conversationId: string | undefined = body.conversationId;
    let conversationTitle: string | undefined;
    let agentHistory: readonly ChatMessage[] = body.history ?? [];

    if (options?.conversationRepo) {
      const existingConversation = conversationId
        ? await options.conversationRepo.getConversation(tenantId, conversationId)
        : null;

      if (!existingConversation) {
        conversationTitle = deriveConversationTitle(trimmedPrompt);
        const created = await options.conversationRepo.createConversation({
          tenantId,
          userId: c.get("user")?.id,
          title: conversationTitle,
        });
        conversationId = created.id;
      } else {
        conversationId = existingConversation.id;
        conversationTitle = existingConversation.title;
        // Sliding window of the last 20 messages to keep token context bounded
        if (existingConversation.messages.length > 0) {
          agentHistory = existingConversation.messages.slice(-20).map((m) => ({
            role: m.role,
            content: m.content,
          }));
        }
      }

      await options.conversationRepo.appendMessage(tenantId, {
        conversationId,
        role: "user",
        content: trimmedPrompt,
      });
    }

    const agent = new DiscoveryAgent(model, repo, tenantId, options);
    const result = await agent.chat(trimmedPrompt, agentHistory);

    const productIds = extractProductIds(result.messages);
    const found = await Promise.all(
      productIds.map((id) => repo.getProductWithVariants(tenantId, id))
    );
    const products = found.filter((p): p is ProductWithVariants => p !== null);

    if (options?.conversationRepo && conversationId) {
      const storedProducts: StoredChatProduct[] = products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        categories: p.categories,
        media: p.media,
        variants: p.variants.map((v) => ({
          id: v.id,
          title: v.title,
          price: { amount: v.price.amount, currency: v.price.currency },
          inventoryQuantity: v.inventoryQuantity,
        })),
      }));

      await options.conversationRepo.appendMessage(tenantId, {
        conversationId,
        role: "assistant",
        content: result.reply,
        products: storedProducts,
      });
    }

    // Raw model/tool messages are intentionally NOT returned: they contain the
    // system prompt and internal tool payloads (see ADR 0007 on prompt leakage).
    return c.json({
      ...(conversationId ? { conversationId, title: conversationTitle } : {}),
      reply: result.reply,
      toolCalls: result.toolCallsExecuted,
      products,
    });
  });

  return router;
}
