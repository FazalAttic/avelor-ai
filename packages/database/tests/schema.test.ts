import { describe, expect, it } from "bun:test";
import { orderItems, orders, productVariants, products } from "../src/index";

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
});
