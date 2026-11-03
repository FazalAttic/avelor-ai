import {
  type AppendMessageInput,
  type ChatRole,
  type Conversation,
  type ConversationFilter,
  type ConversationRepository,
  type ConversationWithMessages,
  type CreateConversationInput,
  parseTenantId,
  type StoredChatMessage,
  type StoredChatProduct,
  type TenantId,
} from "@avelor/core";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../index";
import { conversationMessages, conversations } from "../schema/conversations";

function mapConversationRow(row: typeof conversations.$inferSelect): Conversation {
  return {
    id: row.id,
    tenantId: parseTenantId(row.tenantId),
    userId: row.userId ?? undefined,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMessageRow(row: typeof conversationMessages.$inferSelect): StoredChatMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    tenantId: parseTenantId(row.tenantId),
    role: row.role as ChatRole,
    content: row.content,
    products: (row.products as StoredChatProduct[] | null) ?? undefined,
    createdAt: row.createdAt,
  };
}

/**
 * PostgreSQL Conversation Repository implemented with Drizzle ORM.
 * Fully persists shopper chat sessions and messages across restarts and server workers.
 */
export class DrizzleConversationRepository implements ConversationRepository {
  constructor(private readonly db: Database) {}

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const id = `conv_${crypto.randomUUID()}`;
    const now = new Date();

    const [row] = await this.db
      .insert(conversations)
      .values({
        id,
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        title: input.title?.trim() || "New Conversation",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to insert conversation");
    }

    return mapConversationRow(row);
  }

  async getConversation(
    tenantId: TenantId,
    conversationId: string
  ): Promise<ConversationWithMessages | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)))
      .limit(1);

    if (!row) {
      return null;
    }

    const messageRows = await this.db
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.tenantId, tenantId),
          eq(conversationMessages.conversationId, conversationId)
        )
      )
      .orderBy(conversationMessages.createdAt);

    return {
      ...mapConversationRow(row),
      messages: Object.freeze(messageRows.map(mapMessageRow)),
    };
  }

  async listConversations(
    tenantId: TenantId,
    filter?: ConversationFilter
  ): Promise<readonly Conversation[]> {
    const conditions = [eq(conversations.tenantId, tenantId)];

    if (filter?.userId !== undefined) {
      conditions.push(eq(conversations.userId, filter.userId));
    }

    const limit = Math.max(1, Math.min(filter?.limit ?? 20, 100));
    const offset = Math.max(0, filter?.offset ?? 0);

    const rows = await this.db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    return Object.freeze(rows.map(mapConversationRow));
  }

  async appendMessage(tenantId: TenantId, input: AppendMessageInput): Promise<StoredChatMessage> {
    const now = new Date();

    // Check if conversation exists; auto-create if missing to ensure high resilience
    const [existing] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, input.conversationId)))
      .limit(1);

    if (!existing) {
      await this.db.insert(conversations).values({
        id: input.conversationId,
        tenantId,
        title: "New Conversation",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await this.db
        .update(conversations)
        .set({ updatedAt: now })
        .where(
          and(eq(conversations.tenantId, tenantId), eq(conversations.id, input.conversationId))
        );
    }

    const id = `msg_${crypto.randomUUID()}`;

    const [row] = await this.db
      .insert(conversationMessages)
      .values({
        id,
        conversationId: input.conversationId,
        tenantId,
        role: input.role,
        content: input.content,
        products: input.products ? [...input.products] : null,
        createdAt: now,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to insert conversation message");
    }

    return mapMessageRow(row);
  }

  async updateTitle(
    tenantId: TenantId,
    conversationId: string,
    title: string
  ): Promise<Conversation | null> {
    const [row] = await this.db
      .update(conversations)
      .set({
        title: title.trim() || "New Conversation",
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)))
      .returning();

    if (!row) {
      return null;
    }

    return mapConversationRow(row);
  }

  async deleteConversation(tenantId: TenantId, conversationId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(conversations)
      .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)))
      .returning({ id: conversations.id });

    return deleted.length > 0;
  }
}
