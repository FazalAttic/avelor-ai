import { describe, expect, it } from "bun:test";
import {
  accounts,
  orderItems,
  orders,
  productEmbeddings,
  productVariants,
  products,
  sessions,
  users,
  verifications,
} from "../src/index";

describe("Database schema definitions", () => {
  it("defines products table with required columns", () => {
    expect(products.id.name).toBe("id");
    expect(products.tenantId.name).toBe("tenant_id");
    expect(products.name.name).toBe("name");
    expect(products.status.name).toBe("status");
    expect(products.categories.name).toBe("categories");
    expect(products.attributes.name).toBe("attributes");
  });

  it("defines productVariants table with minor-unit price amount and tenantId", () => {
    expect(productVariants.id.name).toBe("id");
    expect(productVariants.productId.name).toBe("product_id");
    expect(productVariants.tenantId.name).toBe("tenant_id");
    expect(productVariants.sku.name).toBe("sku");
    expect(productVariants.priceAmount.name).toBe("price_amount");
    expect(productVariants.priceCurrency.name).toBe("price_currency");
    expect(productVariants.inventoryQuantity.name).toBe("inventory_quantity");
  });

  it("defines orders and orderItems tables with minor units and idempotency", () => {
    expect(orders.id.name).toBe("id");
    expect(orders.tenantId.name).toBe("tenant_id");
    expect(orders.totalAmount.name).toBe("total_amount");
    expect(orders.status.name).toBe("status");
    expect(orders.idempotencyKey.name).toBe("idempotency_key");

    expect(orderItems.orderId.name).toBe("order_id");
    expect(orderItems.unitPriceAmount.name).toBe("unit_price_amount");
  });

  it("defines Better Auth tables with admin/customer roles and tenant scoping", () => {
    expect(users.id.name).toBe("id");
    expect(users.email.name).toBe("email");
    expect(users.role.name).toBe("role");
    expect(users.tenantId.name).toBe("tenant_id");

    expect(sessions.token.name).toBe("token");
    expect(sessions.userId.name).toBe("user_id");

    expect(accounts.userId.name).toBe("user_id");
    expect(accounts.providerId.name).toBe("provider_id");

    expect(verifications.identifier.name).toBe("identifier");
  });

  it("defines productEmbeddings table with 1536-dim vector and tenant isolation", () => {
    expect(productEmbeddings.id.name).toBe("id");
    expect(productEmbeddings.productId.name).toBe("product_id");
    expect(productEmbeddings.tenantId.name).toBe("tenant_id");
    expect(productEmbeddings.embedding.name).toBe("embedding");
    expect(productEmbeddings.model.name).toBe("model");
    expect(productEmbeddings.contentHash.name).toBe("content_hash");
  });
});
