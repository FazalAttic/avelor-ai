import { index, integer, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 64 }).notNull(),
    cartId: varchar("cart_id", { length: 64 }).notNull(),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    totalAmount: integer("total_amount").notNull(), // Minor units (e.g. cents)
    totalCurrency: varchar("total_currency", { length: 3 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    paymentSessionId: varchar("payment_session_id", { length: 128 }),
    checkoutUrl: varchar("checkout_url", { length: 512 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_tenant_id_idx").on(table.tenantId),
    index("orders_tenant_status_idx").on(table.tenantId, table.status),
    uniqueIndex("orders_tenant_idempotency_idx").on(table.tenantId, table.idempotencyKey),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    orderId: varchar("order_id", { length: 64 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id", { length: 64 }).notNull(),
    variantId: varchar("variant_id", { length: 64 }).notNull(),
    productId: varchar("product_id", { length: 64 }).notNull(),
    sku: varchar("sku", { length: 128 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    unitPriceAmount: integer("unit_price_amount").notNull(),
    unitPriceCurrency: varchar("unit_price_currency", { length: 3 }).notNull(),
    quantity: integer("quantity").notNull(),
    totalPriceAmount: integer("total_price_amount").notNull(),
    totalPriceCurrency: varchar("total_price_currency", { length: 3 }).notNull(),
  },
  (table) => [
    index("order_items_tenant_id_idx").on(table.tenantId),
    index("order_items_order_id_idx").on(table.orderId),
  ]
);
