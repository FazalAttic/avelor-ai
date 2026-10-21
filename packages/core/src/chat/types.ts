import type { TenantId } from "../tenant";

export type ChatRole = "user" | "assistant";

export interface StoredChatVariant {
  readonly id: string;
  readonly title: string;
  readonly price: {
    readonly amount: number;
    readonly currency: string;
  };
  readonly inventoryQuantity: number;
}

export interface StoredChatProduct {
  readonly id: string;
  readonly name: string;
  readonly description?: string | undefined;
  readonly categories?: readonly string[] | undefined;
  readonly media?: readonly string[] | undefined;
  readonly variants?: readonly StoredChatVariant[] | undefined;
}

export interface StoredChatMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly tenantId: TenantId;
  readonly role: ChatRole;
  readonly content: string;
  readonly products?: readonly StoredChatProduct[] | undefined;
  readonly createdAt: Date;
}

export interface Conversation {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId?: string | undefined;
  readonly title: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ConversationWithMessages extends Conversation {
  readonly messages: readonly StoredChatMessage[];
}

export interface CreateConversationInput {
  readonly tenantId: TenantId;
  readonly userId?: string | undefined;
  readonly title?: string | undefined;
}

export interface AppendMessageInput {
  readonly conversationId: string;
  readonly role: ChatRole;
  readonly content: string;
  readonly products?: readonly StoredChatProduct[] | undefined;
}

export interface ConversationFilter {
  readonly userId?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export function deriveConversationTitle(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Conversation";
  if (cleaned.length <= 40) return cleaned;
  const slice = cleaned.slice(0, 40);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 15 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}
