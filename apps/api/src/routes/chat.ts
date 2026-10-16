import {
  type ChatMessage,
  type ChatModel,
  DiscoveryAgent,
  type EmbeddingModel,
  type GuardrailEngine,
  type VectorStore,
} from "@avelor/ai";
import type { CatalogRepository, PolicyRepository, ProductWithVariants } from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { requireTenant } from "../middleware/tenant";

interface ChatRequestBody {
  message: string;
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
}

export function createChatRoutes(
  model: ChatModel,
  repo: CatalogRepository,
  options?: ChatRoutesOptions | undefined
) {
  const router = new Hono<AppEnv>();

  // Ensure every chat query is scoped by tenant identity
  router.use("*", requireTenant);

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

    const agent = new DiscoveryAgent(model, repo, tenantId, options);
    const result = await agent.chat(body.message, body.history ?? []);

    const productIds = extractProductIds(result.messages);
    const found = await Promise.all(
      productIds.map((id) => repo.getProductWithVariants(tenantId, id))
    );
    const products = found.filter((p): p is ProductWithVariants => p !== null);

    // Raw model/tool messages are intentionally NOT returned: they contain the
    // system prompt and internal tool payloads (see ADR 0007 on prompt leakage).
    return c.json({
      reply: result.reply,
      toolCalls: result.toolCallsExecuted,
      products,
    });
  });

  return router;
}
