import { beforeEach, describe, expect, it } from "bun:test";
import { createMoney, InMemoryCatalogRepository, parseTenantId } from "@avelor/core";
import { createAiSdkTools } from "../src/adapters/ai-sdk-model";

describe("Unified AI SDK Tool Integration", () => {
  let repo: InMemoryCatalogRepository;
  const tenantA = parseTenantId("store_alpha");

  beforeEach(async () => {
    repo = new InMemoryCatalogRepository();

    const product = await repo.createProduct({
      tenantId: tenantA,
      name: "Smart Coffee Grinder",
      description: "Conical burr grinder with digital timer",
      status: "active",
      categories: ["appliances", "coffee"],
    });

    await repo.createVariant({
      productId: product.id,
      tenantId: tenantA,
      sku: "GRIND-SS-01",
      title: "Stainless Steel",
      price: createMoney(19900, "USD"), // $199.00
      inventoryQuantity: 12,
    });
  });

  it("provides native search_products tool", async () => {
    const tools = createAiSdkTools(tenantA, repo);
    expect(tools.search_products).toBeDefined();

    const result = (await tools.search_products.execute?.(
      { query: "grinder" },
      { toolCallId: "call_1", messages: [] }
    )) as { status: string; count: number; products: Array<{ name: string }> };

    expect(result.status).toBe("success");
    expect(result.count).toBe(1);
    expect(result.products[0]?.name).toBe("Smart Coffee Grinder");
  });

  it("provides native get_product_details tool", async () => {
    const list = await repo.listProducts(tenantA);
    const productId = list.items[0]?.id;
    expect(productId).toBeDefined();

    const tools = createAiSdkTools(tenantA, repo);
    const result = (await tools.get_product_details.execute?.(
      { productId: productId ?? "" },
      { toolCallId: "call_2", messages: [] }
    )) as {
      status: string;
      product: {
        name: string;
        variants: Array<{ sku: string; price: { formatted: string } }>;
      };
    };

    expect(result.status).toBe("success");
    expect(result.product.name).toBe("Smart Coffee Grinder");
    expect(result.product.variants[0]?.sku).toBe("GRIND-SS-01");
    expect(result.product.variants[0]?.price.formatted).toBe("$199.00");
  });
});
