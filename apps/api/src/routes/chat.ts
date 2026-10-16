import {
  type ChatMessage,
  type ChatModel,
  DiscoveryAgent,
  type EmbeddingModel,
  type VectorStore,
} from "@avelor/ai";
import type { CatalogRepository, PolicyRepository } from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { requireTenant } from "../middleware/tenant";

interface ChatRequestBody {
  message: string;
  history?: readonly ChatMessage[] | undefined;
}

export interface ChatRoutesOptions {
  readonly embeddingModel?: EmbeddingModel | undefined;
  readonly vectorStore?: VectorStore | undefined;
  readonly policyRepo?: PolicyRepository | undefined;
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

    return c.json({
      reply: result.reply,
      toolCalls: result.toolCallsExecuted,
      messages: result.messages,
    });
  });

  return router;
}
