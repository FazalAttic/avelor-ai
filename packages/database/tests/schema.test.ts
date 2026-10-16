import { describe, expect, it } from "bun:test";
import { productVariants, products } from "../src/index";

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
});
