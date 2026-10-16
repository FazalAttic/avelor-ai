import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull().default(""),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    attributes: jsonb("attributes")
      .$type<Record<string, string | number | boolean | string[]>>()
      .notNull()
      .default({}),
    media: jsonb("media").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_tenant_id_idx").on(table.tenantId),
    index("products_tenant_status_idx").on(table.tenantId, table.status),
  ]
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    productId: varchar("product_id", { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id", { length: 64 }).notNull(),
    sku: varchar("sku", { length: 128 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    priceAmount: integer("price_amount").notNull(), // Minor units (e.g. cents)
    priceCurrency: varchar("price_currency", { length: 3 }).notNull(),
    inventoryQuantity: integer("inventory_quantity").notNull().default(0),
    attributes: jsonb("attributes")
      .$type<Record<string, string | number | boolean | string[]>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("variants_tenant_id_idx").on(table.tenantId),
    index("variants_product_id_idx").on(table.productId),
    uniqueIndex("variants_tenant_sku_idx").on(table.tenantId, table.sku),
  ]
);
