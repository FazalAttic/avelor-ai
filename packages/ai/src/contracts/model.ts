export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ProviderMetadataValue =
  | string
  | number
  | boolean
  | null
  | ProviderMetadataValue[]
  | { [key: string]: ProviderMetadataValue };

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  /**
   * Opaque vendor metadata attached by the provider (e.g. Gemini thought
   * signatures), which must be round-tripped on multi-step tool calls or the
   * provider rejects follow-up requests.
   */
  readonly providerMetadata?: Record<string, Record<string, ProviderMetadataValue>> | undefined;
}

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
  readonly name?: string | undefined;
  readonly toolCalls?: readonly ToolCall[] | undefined;
  readonly toolCallId?: string | undefined;
}

export interface ToolParameterSchema {
  readonly type: "string" | "number" | "boolean" | "object" | "array";
  readonly description?: string | undefined;
  readonly enum?: readonly string[] | undefined;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: "object";
    readonly properties: Readonly<Record<string, ToolParameterSchema>>;
    readonly required?: readonly string[] | undefined;
  };
}

export interface ChatInput {
  readonly messages: readonly ChatMessage[];
  readonly tools?: readonly ToolDefinition[] | undefined;
  readonly temperature?: number | undefined;
  readonly maxTokens?: number | undefined;
}

export interface ChatResult {
  readonly message: ChatMessage;
  readonly finishReason?: "stop" | "tool_calls" | "length" | undefined;
}

export interface ChatModel {
  generate(input: ChatInput): Promise<ChatResult>;
}
