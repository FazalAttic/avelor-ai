import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const storePolicies = pgTable(
  "store_policies",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 64 }).notNull(),
    topic: varchar("topic", { length: 32 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("policies_tenant_idx").on(table.tenantId),
    index("policies_tenant_topic_idx").on(table.tenantId, table.topic),
  ]
);
