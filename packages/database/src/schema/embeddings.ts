import { index, pgTable, timestamp, varchar, vector } from "drizzle-orm/pg-core";
import { products } from "./products";

export const productEmbeddings = pgTable(
  "product_embeddings",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    productId: varchar("product_id", { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id", { length: 64 }).notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("embeddings_tenant_idx").on(table.tenantId),
    index("embeddings_product_idx").on(table.productId),
    index("embeddings_tenant_product_idx").on(table.tenantId, table.productId),
  ]
);
