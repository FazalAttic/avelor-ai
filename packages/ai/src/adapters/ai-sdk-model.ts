import type { CatalogRepository, TenantId } from "@avelor/core";
import { generateText, jsonSchema, type ModelMessage, type ToolSet, tool } from "ai";
import { z } from "zod";
import type {
  ChatInput,
  ChatModel,
  ChatResult,
  ProviderMetadataValue,
  ToolCall,
} from "../contracts/model";
import { executeToolCall } from "../tools/catalog-tools";

/**
 * Creates native AI SDK tools bound strictly to tenant context.
 * Enables streaming or custom agent execution with any provider.
 */
export function createAiSdkTools(tenantId: TenantId, catalogRepo: CatalogRepository): ToolSet {
  return {
    search_products: tool({
      description:
        "Search the store catalog for products by keyword, category, or filter. Returns matching products with IDs and price ranges.",
      inputSchema: z.object({
        query: z.string().optional().describe("Search keyword or term"),
        category: z.string().optional().describe("Filter by category slug or name"),
        limit: z.number().optional().describe("Maximum number of products to return (max 10)"),
      }),
      execute: async (args: {
        query?: string | undefined;
        category?: string | undefined;
        limit?: number | undefined;
      }) => {
        const raw = await executeToolCall("search_products", args, {
          tenantId,
          catalogRepo,
        });
        return JSON.parse(raw);
      },
    }),

    get_product_details: tool({
      description:
        "Retrieve authoritative details for a specific product including description, variants, price, and stock levels.",
      inputSchema: z.object({
        productId: z.string().describe("The unique product ID"),
      }),
      execute: async (args: { productId: string }) => {
        const raw = await executeToolCall("get_product_details", args, {
          tenantId,
          catalogRepo,
        });
        return JSON.parse(raw);
      },
    }),
  };
}

/**
 * Adapter implementing Avelor's ChatModel port using the standard AI SDK.
 * Decouples business logic while allowing any LanguageModel (OpenAI, Anthropic, Gemini, Ollama, etc.) to be used.
 */
export class AiSdkChatModel implements ChatModel {
  constructor(private readonly model: Parameters<typeof generateText>[0]["model"]) {}

  async generate(input: ChatInput): Promise<ChatResult> {
    // 1. Convert Avelor ChatMessages to ModelMessages
    const messages: ModelMessage[] = [];

    for (const msg of input.messages) {
      if (msg.role === "system") {
        messages.push({ role: "system", content: msg.content });
      } else if (msg.role === "user") {
        messages.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          messages.push({
            role: "assistant",
            content: msg.toolCalls.map((tc) => ({
              type: "tool-call" as const,
              toolCallId: tc.id,
              toolName: tc.name,
              input: tc.arguments,
              ...(tc.providerMetadata ? { providerOptions: tc.providerMetadata } : {}),
            })),
          });
        } else {
          messages.push({ role: "assistant", content: msg.content });
        }
      } else if (msg.role === "tool") {
        messages.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: msg.toolCallId ?? "unknown",
              toolName: msg.name ?? "unknown",
              output: { type: "text", value: msg.content },
            },
          ],
        });
      }
    }

    // 2. Convert Avelor ToolDefinitions to SDK tools with full JSON schema
    const sdkTools: ToolSet = {};
    if (input.tools) {
      for (const t of input.tools) {
        sdkTools[t.name] = tool({
          description: t.description,
          inputSchema: t.parameters
            ? jsonSchema(t.parameters as never)
            : z.record(z.string(), z.unknown()),
          execute: async (args: Record<string, unknown>) => args,
        });
      }
    }

    // 3. Build generateText arguments adhering to exactOptionalPropertyTypes
    const generateArgs: Parameters<typeof generateText>[0] = {
      model: this.model,
      messages,
      ...(Object.keys(sdkTools).length > 0 ? { tools: sdkTools } : {}),
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
      ...(input.maxTokens !== undefined ? { maxOutputTokens: input.maxTokens } : {}),
    };

    // 4. Invoke model execution
    const response = await generateText(generateArgs);

    // 5. Map back to Avelor ChatResult, preserving provider metadata (e.g. Gemini
    // thought signatures) so multi-step tool loops can round-trip them.
    const metadataByCallId = new Map<
      string,
      Record<string, Record<string, ProviderMetadataValue>>
    >();
    for (const m of response.response.messages) {
      if (m.role !== "assistant" || typeof m.content === "string") continue;
      for (const part of m.content) {
        if (part.type === "tool-call" && part.providerOptions) {
          metadataByCallId.set(part.toolCallId, part.providerOptions);
        }
      }
    }

    const toolCalls: ToolCall[] = response.toolCalls.map((tc) => ({
      id: tc.toolCallId,
      name: tc.toolName,
      arguments: (tc.input ?? {}) as Record<string, unknown>,
      ...(metadataByCallId.has(tc.toolCallId)
        ? { providerMetadata: metadataByCallId.get(tc.toolCallId) }
        : {}),
    }));

    return {
      message: {
        role: "assistant",
        content: response.text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      finishReason: response.finishReason === "tool-calls" ? "tool_calls" : "stop",
    };
  }
}
