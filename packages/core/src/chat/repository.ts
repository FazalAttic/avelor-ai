import type { TenantId } from "../tenant";
import type {
  AppendMessageInput,
  Conversation,
  ConversationFilter,
  ConversationWithMessages,
  CreateConversationInput,
  StoredChatMessage,
} from "./types";

export interface ConversationRepository {
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  getConversation(
    tenantId: TenantId,
    conversationId: string
  ): Promise<ConversationWithMessages | null>;
  listConversations(
    tenantId: TenantId,
    filter?: ConversationFilter
  ): Promise<readonly Conversation[]>;
  appendMessage(tenantId: TenantId, input: AppendMessageInput): Promise<StoredChatMessage>;
  updateTitle(
    tenantId: TenantId,
    conversationId: string,
    title: string
  ): Promise<Conversation | null>;
  deleteConversation(tenantId: TenantId, conversationId: string): Promise<boolean>;
}
