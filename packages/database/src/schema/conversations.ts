import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 64 }).notNull(),
    userId: text("user_id"),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("conversations_tenant_idx").on(table.tenantId),
    index("conversations_tenant_user_idx").on(table.tenantId, table.userId),
    index("conversations_tenant_updated_idx").on(table.tenantId, table.updatedAt),
  ]
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    conversationId: varchar("conversation_id", { length: 64 })
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id", { length: 64 }).notNull(),
    role: varchar("role", { length: 32 }).notNull(),
    content: text("content").notNull(),
    products: jsonb("products"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("conv_messages_tenant_conv_idx").on(table.tenantId, table.conversationId),
    index("conv_messages_created_idx").on(table.createdAt),
  ]
);
