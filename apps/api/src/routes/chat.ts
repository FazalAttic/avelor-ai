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
import { streamSSE } from "hono/streaming";
import type { AppEnv } from "../app";
import { requireTenant } from "../middleware/tenant";

interface ChatRequestBody {
  message: string;
  conversationId?: string | undefined;
  history?: readonly ChatMessage[] | undefined;
  stream?: boolean | undefined;
}

interface ToolResultPayload {
  products?: readonly { id?: unknown }[];
  product?: { id?: unknown } | null;
}

// Collect IDs of products referenced by catalog tool results so clients can
// render grounded product cards without receiving raw model/tool messages.
function extractProductIds(messages: readonly ChatMessage[], assistantReply?: string): string[] {
  const candidateProducts: { id: string; name: string }[] = [];
  const seenIds = new Set<string>();

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
        const id = payload.product.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          candidateProducts.push({
            id,
            name:
              typeof (payload.product as { name?: unknown }).name === "string"
                ? ((payload.product as { name?: string }).name ?? "")
                : "",
          });
        }
      }
      for (const product of payload.products ?? []) {
        if (typeof product.id === "string") {
          const id = product.id;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            candidateProducts.push({
              id,
              name:
                typeof (product as { name?: unknown }).name === "string"
                  ? ((product as { name?: string }).name ?? "")
                  : "",
            });
          }
        }
      }
    } catch {
      // Tool output was not catalog JSON — nothing to extract
    }
  }

  // If the assistant explicitly named or recommended products in its reply,
  // ensure the carousel features those products in conversational order.
  if (assistantReply && candidateProducts.length > 0) {
    const lowerReply = assistantReply.toLowerCase();
    const matched = candidateProducts.filter((p) => {
      if (!p.name) return false;
      const lowerName = p.name.toLowerCase();
      if (lowerReply.includes(lowerName)) return true;
      const firstTwoWords = lowerName.split(/\s+/).slice(0, 2).join(" ");
      return firstTwoWords.length > 3 && lowerReply.includes(firstTwoWords);
    });

    if (matched.length > 0) {
      return matched.map((p) => p.id);
    }
  }

  return candidateProducts.map((p) => p.id);
}

// Remove raw backend UUIDs, product IDs (e.g. (ID: prod_...)), and developer metadata
// so shoppers only see clean, customer-facing product titles and descriptions.
function cleanCustomerFacingReply(text: string): string {
  if (!text) return "";
  return text
    .replace(/\s*\([iI][dD]:\s*`?[a-zA-Z0-9_.-]+`?\)/g, "")
    .replace(/\s*\[[iI][dD]:\s*`?[a-zA-Z0-9_.-]+`?\]/g, "")
    .replace(/\s*\(`?prod_[a-zA-Z0-9_.-]+`?\)/g, "")
    .replace(/\s*\[`?prod_[a-zA-Z0-9_.-]+`?\]/g, "")
    .replace(/\s*`prod_[a-zA-Z0-9_.-]+`/g, "")
    .replace(/ +([.,!?;:])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
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

      try {
        await options.conversationRepo.appendMessage(tenantId, {
          conversationId,
          role: "user",
          content: trimmedPrompt,
        });
      } catch (err) {
        console.warn(
          `[Avelor Chat] Failed to persist user message to conversation ${conversationId}:`,
          err
        );
      }
    }

    const wantsStream =
      body.stream === true || c.req.header("accept")?.includes("text/event-stream");

    const requestStart = performance.now();
    console.log(
      `[Avelor API] 📩 Received chat query: "${trimmedPrompt}" (stream: ${wantsStream}, tenantId: "${tenantId}", conversationId: "${conversationId ?? "new"}")`
    );

    if (wantsStream) {
      return streamSSE(c, async (stream) => {
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        try {
          if (conversationId) {
            await stream.writeSSE({
              data: JSON.stringify({
                type: "meta",
                conversationId,
                title: conversationTitle,
              }),
            });
          }

          // Keep-alive ping every 3 seconds to prevent proxy / browser / socket idle timeouts during LLM tool calls
          heartbeat = setInterval(() => {
            stream
              .writeSSE({
                data: JSON.stringify({ type: "ping" }),
              })
              .catch(() => {
                if (heartbeat) clearInterval(heartbeat);
              });
          }, 3000);

          const agent = new DiscoveryAgent(model, repo, tenantId, options);
          const result = await agent.chatStream(trimmedPrompt, agentHistory, async (delta) => {
            await stream.writeSSE({
              data: JSON.stringify({
                type: "delta",
                text: delta,
              }),
            });
          });

          if (heartbeat) clearInterval(heartbeat);

          const rawReply = result.reply?.trim() || "";
          const cleanedReply = cleanCustomerFacingReply(rawReply);

          const productIds = extractProductIds(result.messages, cleanedReply);
          const found = await Promise.all(
            productIds.map((id) => repo.getProductWithVariants(tenantId, id))
          );
          const products = found.filter((p): p is ProductWithVariants => p !== null);

          const safeReply =
            cleanedReply ||
            (products.length > 0
              ? "Here are the top products I found in our store for you. Let me know if you would like more details or need help finding anything else!"
              : "I couldn't find items matching your request in our catalog. Would you like to explore other categories or try a different search?");

          if (options?.conversationRepo && conversationId) {
            try {
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
                content: safeReply,
                products: storedProducts,
              });
            } catch (err) {
              console.warn(
                `[Avelor Chat] Failed to persist assistant message to conversation ${conversationId}:`,
                err
              );
            }
          }

          const streamDuration = Math.round(performance.now() - requestStart);
          console.log(
            `[Avelor API] 📤 Stream completed in ${streamDuration}ms (products: ${products.length}, conversationId: "${conversationId}")`
          );

          await stream.writeSSE({
            data: JSON.stringify({
              type: "done",
              reply: safeReply,
              products,
              conversationId,
              title: conversationTitle,
            }),
          });
        } catch (streamErr) {
          if (heartbeat) clearInterval(heartbeat);
          console.error("[Avelor Chat] Streaming error:", streamErr);
          try {
            await stream.writeSSE({
              data: JSON.stringify({
                type: "done",
                reply:
                  "I had a momentary glitch connecting to our catalog. Please try asking again, or browse our store collections below!",
                products: [],
                conversationId,
                title: conversationTitle,
              }),
            });
          } catch {
            // Stream was closed
          }
        }
      });
    }

    try {
      const agent = new DiscoveryAgent(model, repo, tenantId, options);
      const result = await agent.chat(trimmedPrompt, agentHistory);

      const rawReply = result.reply?.trim() || "";
      const cleanedReply = cleanCustomerFacingReply(rawReply);

      const productIds = extractProductIds(result.messages, cleanedReply);
      const found = await Promise.all(
        productIds.map((id) => repo.getProductWithVariants(tenantId, id))
      );
      const products = found.filter((p): p is ProductWithVariants => p !== null);

      const safeReply =
        cleanedReply ||
        (products.length > 0
          ? "Here are the top products I found in our store for you. Let me know if you would like more details or need help finding anything else!"
          : "I couldn't find items matching your request in our catalog. Would you like to explore other categories or try a different search?");

      if (options?.conversationRepo && conversationId) {
        try {
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
            content: safeReply,
            products: storedProducts,
          });
        } catch (err) {
          console.warn(
            `[Avelor Chat] Failed to persist assistant message to conversation ${conversationId}:`,
            err
          );
        }
      }

      const syncDuration = Math.round(performance.now() - requestStart);
      console.log(
        `[Avelor API] 📤 Completed in ${syncDuration}ms (products: ${products.length}, conversationId: "${conversationId}")`
      );

      // Raw model/tool messages are intentionally NOT returned: they contain the
      // system prompt and internal tool payloads (see ADR 0007 on prompt leakage).
      return c.json({
        ...(conversationId ? { conversationId, title: conversationTitle } : {}),
        reply: safeReply,
        toolCalls: result.toolCallsExecuted,
        products,
      });
    } catch (chatErr) {
      console.error("[Avelor Chat] Chat generation error:", chatErr);
      return c.json({
        ...(conversationId ? { conversationId, title: conversationTitle } : {}),
        reply:
          "I had a momentary glitch connecting to our catalog. Please try asking again, or browse our store collections below!",
        toolCalls: [],
        products: [],
      });
    }
  });

  return router;
}
