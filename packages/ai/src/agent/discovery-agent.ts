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
    const startTotal = performance.now();
    let totalLlmTime = 0;
    let totalToolTime = 0;
    let llmCallCount = 0;

    console.log(`\n================== [Avelor AI Discovery Agent (Sync)] ==================`);
    console.log(`💬 User Query: "${userQuery}"`);
    console.log(`📜 Context History: ${history.length} message(s)`);

    const messages: ChatMessage[] = [
      { role: "system", content: DISCOVERY_SYSTEM_PROMPT },
      ...history.filter((m) => m.role !== "system"),
      { role: "user", content: userQuery.trim() },
    ];

    // 1. Pre-execution Input Guardrail
    if (this.options?.guardrail) {
      const guardStart = performance.now();
      const inputCheck = await this.options.guardrail.checkInput({
        text: userQuery,
        role: "user",
      });
      console.log(
        `🛡️  Input Guardrail evaluated in ${Math.round(performance.now() - guardStart)}ms (verdict: ${inputCheck.verdict})`
      );

      if (inputCheck.verdict === "rejected" && inputCheck.category !== "out_of_domain") {
        let rejectionReply: string;
        if (
          inputCheck.category === "prompt_injection" ||
          inputCheck.category === "malicious_script"
        ) {
          rejectionReply =
            "I am your store shopping assistant. I cannot execute system overrides or external scripts, but I'm happy to help you discover products, check stock, or review store policies.";
        } else {
          rejectionReply =
            "Your message could not be processed due to store safety policies. Please rephrase your shopping inquiry.";
        }

        const rejectionMessage: ChatMessage = {
          role: "assistant",
          content: rejectionReply,
        };

        console.log(`🚫 Query rejected by guardrails.`);
        console.log(`========================================================================\n`);

        return {
          reply: rejectionReply,
          messages: Object.freeze([...messages, rejectionMessage]),
          toolCallsExecuted: Object.freeze([]),
        };
      }
    }

    const toolCallsExecuted: ToolCall[] = [];

    // Step 1: Route query / check if tools are required
    llmCallCount++;
    const step1Start = performance.now();
    console.log(`🤖 Step 1: Querying LLM for intent & tool selection...`);

    const response = await this.model.generate({
      messages,
      tools: CATALOG_TOOLS,
      temperature: 0.1,
    });

    const step1Duration = Math.round(performance.now() - step1Start);
    totalLlmTime += step1Duration;
    console.log(`⏱️  Step 1: LLM responded in ${step1Duration}ms`);

    const assistantMessage = response.message;
    messages.push(assistantMessage);

    // If no tool calls requested (e.g. conversational greetings, store hours, general chat)
    if (!assistantMessage.toolCalls || assistantMessage.toolCalls.length === 0) {
      console.log(`🛠️  Tool Calls: None (direct response generated)`);
      let reply = assistantMessage.content?.trim() || "";
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

      const totalDuration = Math.round(performance.now() - startTotal);
      console.log(
        `📊 Total Agent Time: ${totalDuration}ms (LLM: ${totalLlmTime}ms | Tools: ${totalToolTime}ms | LLM Calls: ${llmCallCount})`
      );
      console.log(`========================================================================\n`);

      return {
        reply,
        messages: Object.freeze(messages),
        toolCallsExecuted: Object.freeze(toolCallsExecuted),
      };
    }

    // Step 2: Execute all requested tools in PARALLEL
    console.log(
      `🛠️  Tool Calls Requested (${assistantMessage.toolCalls.length}): ${assistantMessage.toolCalls.map((t) => t.name).join(", ")}`
    );

    const toolPhaseStart = performance.now();
    const toolResults = await Promise.all(
      assistantMessage.toolCalls.map(async (call) => {
        toolCallsExecuted.push(call);
        console.log(`  ▶ Executing: ${call.name} with args:`, JSON.stringify(call.arguments));
        const singleToolStart = performance.now();
        const resultString = await executeToolCall(call.name, call.arguments, {
          tenantId: this.tenantId,
          catalogRepo: this.catalogRepo,
          ...(this.options?.policyRepo ? { policyRepo: this.options.policyRepo } : {}),
          ...(this.options?.embeddingModel ? { embeddingModel: this.options.embeddingModel } : {}),
          ...(this.options?.vectorStore ? { vectorStore: this.options.vectorStore } : {}),
        });
        const singleDuration = Math.round(performance.now() - singleToolStart);
        console.log(
          `  ✔ Tool ${call.name} completed in ${singleDuration}ms (${resultString.length} chars output)`
        );
        return {
          role: "tool" as const,
          content: resultString,
          name: call.name,
          toolCallId: call.id,
        };
      })
    );

    const parallelToolDuration = Math.round(performance.now() - toolPhaseStart);
    totalToolTime += parallelToolDuration;
    console.log(
      `⚡ All ${toolResults.length} tool(s) completed concurrently in ${parallelToolDuration}ms`
    );

    for (const res of toolResults) {
      messages.push(res);
    }

    // Step 3: Fast Grounded Synthesis (Single round-trip, no redundant loops)
    console.log(`🤖 Final Synthesis: Invoking LLM for shopping recommendations...`);
    llmCallCount++;
    const synthStart = performance.now();

    const finalResponse = await this.model.generate({
      messages,
      temperature: 0.1,
    });

    const synthDuration = Math.round(performance.now() - synthStart);
    totalLlmTime += synthDuration;
    console.log(`⏱️  Final Synthesis completed in ${synthDuration}ms`);

    let finalReply = finalResponse.message.content?.trim();
    if (!finalReply) {
      finalReply =
        toolCallsExecuted.length > 0
          ? "Here are the top products I found in our store for you. Feel free to ask if you would like more details on any of them!"
          : "I searched our store but couldn't find items matching your request. Would you like to check out another category or try a different search?";
    }
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

    const totalDuration = Math.round(performance.now() - startTotal);
    console.log(
      `📊 Total Agent Time: ${totalDuration}ms (LLM: ${totalLlmTime}ms | Tools: ${totalToolTime}ms | LLM Calls: ${llmCallCount} | Tools Executed: ${toolCallsExecuted.length})`
    );
    console.log(`========================================================================\n`);

    return {
      reply: finalReply,
      messages: Object.freeze(messages),
      toolCallsExecuted: Object.freeze(toolCallsExecuted),
    };
  }

  async chatStream(
    userQuery: string,
    history: readonly ChatMessage[] = [],
    onChunk: (delta: string) => Promise<void> | void
  ): Promise<AgentExecutionResult> {
    const startTotal = performance.now();
    let totalLlmTime = 0;
    let totalToolTime = 0;
    let llmCallCount = 0;

    console.log(`\n================== [Avelor AI Discovery Agent (Stream)] ==================`);
    console.log(`💬 User Query: "${userQuery}"`);
    console.log(`📜 Context History: ${history.length} message(s)`);

    const messages: ChatMessage[] = [
      { role: "system", content: DISCOVERY_SYSTEM_PROMPT },
      ...history.filter((m) => m.role !== "system"),
      { role: "user", content: userQuery.trim() },
    ];

    // 1. Pre-execution Input Guardrail
    if (this.options?.guardrail) {
      const guardStart = performance.now();
      const inputCheck = await this.options.guardrail.checkInput({
        text: userQuery,
        role: "user",
      });
      console.log(
        `🛡️  Input Guardrail evaluated in ${Math.round(performance.now() - guardStart)}ms (verdict: ${inputCheck.verdict})`
      );

      if (inputCheck.verdict === "rejected" && inputCheck.category !== "out_of_domain") {
        let rejectionReply: string;
        if (
          inputCheck.category === "prompt_injection" ||
          inputCheck.category === "malicious_script"
        ) {
          rejectionReply =
            "I am your store shopping assistant. I cannot execute system overrides or external scripts, but I'm happy to help you discover products, check stock, or review store policies.";
        } else {
          rejectionReply =
            "Your message could not be processed due to store safety policies. Please rephrase your shopping inquiry.";
        }

        console.log(`🚫 Query rejected by guardrails.`);
        console.log(`==========================================================================\n`);

        await onChunk(rejectionReply);
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

    // Step 1: Query LLM for intent & tool decision
    llmCallCount++;
    const step1Start = performance.now();
    console.log(`🤖 Step 1: Querying LLM for intent & tool selection...`);

    const response = await this.model.generate({
      messages,
      tools: CATALOG_TOOLS,
      temperature: 0.1,
    });

    const step1Duration = Math.round(performance.now() - step1Start);
    totalLlmTime += step1Duration;
    console.log(`⏱️  Step 1: LLM responded in ${step1Duration}ms`);

    const assistantMessage = response.message;
    messages.push(assistantMessage);

    // If no tool calls requested (e.g. conversational responses, greetings, general store questions)
    if (!assistantMessage.toolCalls || assistantMessage.toolCalls.length === 0) {
      console.log(`🛠️  Tool Calls: None (direct streaming response)`);
      let reply = assistantMessage.content?.trim();
      if (!reply) {
        reply =
          toolCallsExecuted.length > 0
            ? "Here are the top products I found in our store for you. Feel free to ask if you would like more details on any of them!"
            : "I searched our store but couldn't find items matching your request. Would you like to check out another category or try a different search?";
      }
      await onChunk(reply);

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

      const totalDuration = Math.round(performance.now() - startTotal);
      console.log(
        `📊 Total Agent Time: ${totalDuration}ms (LLM: ${totalLlmTime}ms | Tools: ${totalToolTime}ms | LLM Calls: ${llmCallCount})`
      );
      console.log(`==========================================================================\n`);

      return {
        reply,
        messages: Object.freeze(messages),
        toolCallsExecuted: Object.freeze(toolCallsExecuted),
      };
    }

    // Step 2: Tools WERE requested — execute all in PARALLEL
    console.log(
      `🛠️  Tool Calls Requested (${assistantMessage.toolCalls.length}): ${assistantMessage.toolCalls.map((t) => t.name).join(", ")}`
    );

    const toolPhaseStart = performance.now();
    const toolResults = await Promise.all(
      assistantMessage.toolCalls.map(async (call) => {
        toolCallsExecuted.push(call);
        console.log(`  ▶ Executing: ${call.name} with args:`, JSON.stringify(call.arguments));
        const singleToolStart = performance.now();
        const resultString = await executeToolCall(call.name, call.arguments, {
          tenantId: this.tenantId,
          catalogRepo: this.catalogRepo,
          ...(this.options?.policyRepo ? { policyRepo: this.options.policyRepo } : {}),
          ...(this.options?.embeddingModel ? { embeddingModel: this.options.embeddingModel } : {}),
          ...(this.options?.vectorStore ? { vectorStore: this.options.vectorStore } : {}),
        });
        const singleDuration = Math.round(performance.now() - singleToolStart);
        console.log(
          `  ✔ Tool ${call.name} completed in ${singleDuration}ms (${resultString.length} chars output)`
        );
        return {
          role: "tool" as const,
          content: resultString,
          name: call.name,
          toolCallId: call.id,
        };
      })
    );

    const parallelToolDuration = Math.round(performance.now() - toolPhaseStart);
    totalToolTime += parallelToolDuration;
    console.log(
      `⚡ All ${toolResults.length} tool(s) completed concurrently in ${parallelToolDuration}ms`
    );

    for (const res of toolResults) {
      messages.push(res);
    }

    // Step 3: Fast Grounded Synthesis streamed LIVE to the shopper
    console.log(`🤖 Final Synthesis: Invoking LLM to stream customer recommendations...`);
    llmCallCount++;
    const synthStart = performance.now();
    let synthFirstToken: number | null = null;

    let finalReply = "";
    if (this.model.streamText) {
      const res = await this.model.streamText(
        {
          messages,
          temperature: 0.1,
        },
        async (chunk) => {
          if (synthFirstToken === null) {
            synthFirstToken = Math.round(performance.now() - synthStart);
            console.log(`⚡ Final Synthesis: First token streamed in ${synthFirstToken}ms (TTFT)`);
          }
          finalReply += chunk;
          await onChunk(chunk);
        }
      );
      if (!finalReply.trim()) {
        finalReply = res.message.content?.trim() || "";
      }
    } else {
      const finalResponse = await this.model.generate({
        messages,
        temperature: 0.1,
      });
      finalReply = finalResponse.message.content?.trim() || "";
      await onChunk(finalReply);
    }

    const synthDuration = Math.round(performance.now() - synthStart);
    totalLlmTime += synthDuration;
    console.log(`⏱️  Final Synthesis completed in ${synthDuration}ms`);

    if (!finalReply) {
      finalReply =
        toolCallsExecuted.length > 0
          ? "Here are the top products I found in our store for you. Feel free to ask if you would like more details on any of them!"
          : "I searched our store but couldn't find items matching your request. Would you like to check out another category or try a different search?";
      await onChunk(finalReply);
    }

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

    const totalDuration = Math.round(performance.now() - startTotal);
    console.log(
      `📊 Total Agent Time: ${totalDuration}ms (LLM: ${totalLlmTime}ms | Tools: ${totalToolTime}ms | LLM Calls: ${llmCallCount} | Tools Executed: ${toolCallsExecuted.length})`
    );
    console.log(`==========================================================================\n`);

    return {
      reply: finalReply,
      messages: Object.freeze(messages),
      toolCallsExecuted: Object.freeze(toolCallsExecuted),
    };
  }
}
