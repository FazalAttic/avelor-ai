import type { CatalogRepository, PolicyRepository, TenantId } from "@avelor/core";
import type { EmbeddingModel } from "../contracts/embedding";
import type { GuardrailEngine } from "../contracts/guardrail";
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
  readonly policyRepo?: PolicyRepository | undefined;
  readonly guardrail?: GuardrailEngine | undefined;
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

    // 1. Pre-execution Input Guardrail
    if (this.options?.guardrail) {
      const inputCheck = await this.options.guardrail.checkInput({
        text: userQuery,
        role: "user",
      });

      if (inputCheck.verdict === "rejected") {
        let rejectionReply: string;
        if (
          inputCheck.category === "prompt_injection" ||
          inputCheck.category === "malicious_script"
        ) {
          rejectionReply =
            "I am your store shopping assistant. I cannot execute system overrides or external scripts, but I'm happy to help you discover products, check stock, or review store policies.";
        } else if (inputCheck.category === "out_of_domain") {
          rejectionReply =
            "I specialize exclusively in helping you find products and assist with your shopping at our store. How can I help you with our catalog today?";
        } else {
          rejectionReply =
            "Your message could not be processed due to store safety policies. Please rephrase your shopping inquiry.";
        }

        const rejectionMessage: ChatMessage = {
          role: "assistant",
          content: rejectionReply,
        };

        return {
          reply: rejectionReply,
          messages: Object.freeze([...messages, rejectionMessage]),
          toolCallsExecuted: Object.freeze([]),
        };
      }
    }

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
        let reply = assistantMessage.content;
        if (this.options?.guardrail) {
          const outCheck = await this.options.guardrail.checkOutput({
            text: reply,
            role: "assistant",
          });
          if (outCheck.verdict === "rejected") {
            reply =
              "I encountered an issue verifying the response against safety policies. Please try again.";
          }
        }

        return {
          reply,
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
          ...(this.options?.policyRepo ? { policyRepo: this.options.policyRepo } : {}),
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

    let finalReply = finalResponse.message.content;
    if (this.options?.guardrail) {
      const outCheck = await this.options.guardrail.checkOutput({
        text: finalReply,
        role: "assistant",
      });
      if (outCheck.verdict === "rejected") {
        finalReply =
          "I encountered an issue verifying the response against safety policies. Please try again.";
      }
    }

    messages.push({
      role: "assistant",
      content: finalReply,
    });

    return {
      reply: finalReply,
      messages: Object.freeze(messages),
      toolCallsExecuted: Object.freeze(toolCallsExecuted),
    };
  }
}
