import type { ChatInput, ChatModel, ChatResult } from "../contracts/model";

/**
 * Deterministic MockChatModel for CI tests, offline development, and zero-cost benchmarks.
 * Emulates LLM tool calling for search and product inspection.
 */
export class MockChatModel implements ChatModel {
  async generate(input: ChatInput): Promise<ChatResult> {
    const lastMessage = input.messages[input.messages.length - 1];

    if (!lastMessage) {
      return {
        message: { role: "assistant", content: "How can I assist you with your shopping today?" },
      };
    }

    // 1. If last message was a tool result, ground the response in that data
    if (lastMessage.role === "tool") {
      try {
        const data = JSON.parse(lastMessage.content);
        if (data.status === "empty") {
          return {
            message: {
              role: "assistant",
              content:
                "I couldn't find any products matching your search. Would you like to check another category?",
            },
            finishReason: "stop",
          };
        }

        if (data.status === "success" && Array.isArray(data.products)) {
          const names = data.products
            .map((p: { name: string; id: string }) => `${p.name} (ID: ${p.id})`)
            .join(", ");
          return {
            message: {
              role: "assistant",
              content: `Here are the matching products I found: ${names}.`,
            },
            finishReason: "stop",
          };
        }

        if (data.topic) {
          const detail = data.content ?? data.message;
          return {
            message: {
              role: "assistant",
              content: `Regarding our ${data.topic} policy: ${detail}`,
            },
            finishReason: "stop",
          };
        }

        if (data.status === "success" && data.product) {
          const p = data.product;
          return {
            message: {
              role: "assistant",
              content: `Details for ${p.name}: ${p.description}. It has ${p.variants?.length ?? 0} variants available.`,
            },
            finishReason: "stop",
          };
        }
      } catch {
        return {
          message: {
            role: "assistant",
            content: "I encountered an error processing the catalog data.",
          },
          finishReason: "stop",
        };
      }
    }

    // 2. If user message requests store policies (Knowledge RAG)
    const content = lastMessage.content.toLowerCase();
    if (content.includes("return") || content.includes("refund")) {
      return {
        message: {
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: `call_${crypto.randomUUID().slice(0, 8)}`,
              name: "get_store_policy",
              arguments: { topic: "returns" },
            },
          ],
        },
        finishReason: "tool_calls",
      };
    }

    if (
      content.includes("shipping") ||
      content.includes("delivery") ||
      content.includes("ship to")
    ) {
      return {
        message: {
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: `call_${crypto.randomUUID().slice(0, 8)}`,
              name: "get_store_policy",
              arguments: { topic: "shipping" },
            },
          ],
        },
        finishReason: "tool_calls",
      };
    }

    // 3. If user message requests product details
    if (content.includes("details for") || content.includes("tell me about prod_")) {
      const match = lastMessage.content.match(/prod_[a-zA-Z0-9_-]+/);
      const productId = match ? match[0] : "unknown";
      return {
        message: {
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: `call_${crypto.randomUUID().slice(0, 8)}`,
              name: "get_product_details",
              arguments: { productId },
            },
          ],
        },
        finishReason: "tool_calls",
      };
    }

    // 3. If user message requests a search
    if (
      content.includes("find") ||
      content.includes("search") ||
      content.includes("shoes") ||
      content.includes("coffee") ||
      content.includes("looking for")
    ) {
      // Extract search query
      const queryMatch = lastMessage.content
        .replace(/\b(find|search|for|i am looking for|looking for|show me|me)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      return {
        message: {
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: `call_${crypto.randomUUID().slice(0, 8)}`,
              name: "search_products",
              arguments: { query: queryMatch || undefined },
            },
          ],
        },
        finishReason: "tool_calls",
      };
    }

    // Default conversational greeting
    return {
      message: {
        role: "assistant",
        content:
          "Hello! I am your Avelor shopping assistant. How can I help you find what you need?",
      },
      finishReason: "stop",
    };
  }
}
