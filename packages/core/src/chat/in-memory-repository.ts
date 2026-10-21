import type { TenantId } from "../tenant";
import type { ConversationRepository } from "./repository";
import type {
  AppendMessageInput,
  Conversation,
  ConversationFilter,
  ConversationWithMessages,
  CreateConversationInput,
  StoredChatMessage,
} from "./types";

export class InMemoryConversationRepository implements ConversationRepository {
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, StoredChatMessage[]>();

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const id = `conv_${crypto.randomUUID()}`;
    const now = new Date();

    const conversation: Conversation = {
      id,
      tenantId: input.tenantId,
      userId: input.userId,
      title: input.title?.trim() || "New Conversation",
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(id, conversation);
    this.messages.set(id, []);
    return Object.freeze({ ...conversation });
  }

  async getConversation(
    tenantId: TenantId,
    conversationId: string
  ): Promise<ConversationWithMessages | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      return null;
    }

    const messageList = this.messages.get(conversationId) ?? [];
    return Object.freeze({
      ...conversation,
      messages: Object.freeze([...messageList]),
    });
  }

  async listConversations(
    tenantId: TenantId,
    filter?: ConversationFilter
  ): Promise<readonly Conversation[]> {
    let matches: Conversation[] = [];

    for (const conv of this.conversations.values()) {
      if (conv.tenantId !== tenantId) continue;
      if (filter?.userId !== undefined && conv.userId !== filter.userId) continue;
      matches.push(conv);
    }

    matches.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 20;
    matches = matches.slice(offset, offset + limit);

    return Object.freeze(matches.map((c) => Object.freeze({ ...c })));
  }

  async appendMessage(tenantId: TenantId, input: AppendMessageInput): Promise<StoredChatMessage> {
    const conversation = this.conversations.get(input.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new Error(`Conversation not found: ${input.conversationId}`);
    }

    const now = new Date();
    const id = `msg_${crypto.randomUUID()}`;

    const storedMessage: StoredChatMessage = {
      id,
      conversationId: input.conversationId,
      tenantId,
      role: input.role,
      content: input.content,
      products: input.products ? Object.freeze([...input.products]) : undefined,
      createdAt: now,
    };

    const messageList = this.messages.get(input.conversationId) ?? [];
    messageList.push(storedMessage);
    this.messages.set(input.conversationId, messageList);

    // Update conversation's updatedAt timestamp
    const updatedConversation: Conversation = {
      ...conversation,
      updatedAt: now,
    };
    this.conversations.set(input.conversationId, updatedConversation);

    return Object.freeze({ ...storedMessage });
  }

  async updateTitle(
    tenantId: TenantId,
    conversationId: string,
    title: string
  ): Promise<Conversation | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      return null;
    }

    const updated: Conversation = {
      ...conversation,
      title: title.trim() || conversation.title,
      updatedAt: new Date(),
    };

    this.conversations.set(conversationId, updated);
    return Object.freeze({ ...updated });
  }

  async deleteConversation(tenantId: TenantId, conversationId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      return false;
    }

    this.conversations.delete(conversationId);
    this.messages.delete(conversationId);
    return true;
  }
}
