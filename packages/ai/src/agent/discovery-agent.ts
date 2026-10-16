import type { CatalogRepository, TenantId } from "@avelor/core";
import type { EmbeddingModel } from "../contracts/embedding";
import type { ChatMessage, ChatModel, ToolCall } from "../contracts/model";
import type { VectorStore } from "../contracts/vector-store";
import { DISCOVERY_SYSTEM_PROMPT } from "../prompts/discovery";
import { CATALOG_TOOLS, executeToolCall } from "../tools/catalog-tools";

export interface AgentExecutionResult {
  readonly reply: string;
  readonly messages: readonly ChatMessage[];
  readonly toolCallsExecuted: readonly ToolCall[];
}

export interface DiscoveryAgentOptions {
  readonly embeddingModel?: EmbeddingModel | undefined;
  readonly vectorStore?: VectorStore | undefined;
}

export class DiscoveryAgent {
  constructor(
    private readonly model: ChatModel,
    private readonly catalogRepo: CatalogRepository,
    private readonly tenantId: TenantId,
    private readonly options?: DiscoveryAgentOptions | undefined
  ) {}

  async chat(
    userQuery: string,
    history: readonly ChatMessage[] = []
  ): Promise<AgentExecutionResult> {
    const messages: ChatMessage[] = [
      { role: "system", content: DISCOVERY_SYSTEM_PROMPT },
      ...history.filter((m) => m.role !== "system"),
      { role: "user", content: userQuery.trim() },
    ];

    const toolCallsExecuted: ToolCall[] = [];

    // ponytail: execution loop ceiling: max 3 iterations to prevent infinite tool loops
    // and bounded token consumption. Upgrade path: configurable per tenant with timeout budget.
    const MAX_STEPS = 3;

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await this.model.generate({
        messages,
        tools: CATALOG_TOOLS,
        temperature: 0.1,
      });

      const assistantMessage = response.message;
      messages.push(assistantMessage);

      // If no tool calls requested, we are done
      if (!assistantMessage.toolCalls || assistantMessage.toolCalls.length === 0) {
        return {
          reply: assistantMessage.content,
          messages: Object.freeze(messages),
          toolCallsExecuted: Object.freeze(toolCallsExecuted),
        };
      }

      // Execute each tool call
      for (const call of assistantMessage.toolCalls) {
        toolCallsExecuted.push(call);
        const resultString = await executeToolCall(call.name, call.arguments, {
          tenantId: this.tenantId,
          catalogRepo: this.catalogRepo,
          ...(this.options?.embeddingModel ? { embeddingModel: this.options.embeddingModel } : {}),
          ...(this.options?.vectorStore ? { vectorStore: this.options.vectorStore } : {}),
        });

        messages.push({
          role: "tool",
          content: resultString,
          name: call.name,
          toolCallId: call.id,
        });
      }
    }

    // If max steps reached, request final summary
    const finalResponse = await this.model.generate({
      messages,
      temperature: 0.1,
    });

    messages.push(finalResponse.message);

    return {
      reply: finalResponse.message.content,
      messages: Object.freeze(messages),
      toolCallsExecuted: Object.freeze(toolCallsExecuted),
    };
  }
}
