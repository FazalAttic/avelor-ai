import { beforeEach, describe, expect, it } from "bun:test";
import { InMemoryCatalogRepository, createMoney, parseTenantId } from "@avelor/core";
import { DiscoveryAgent } from "../src/agent/discovery-agent";
import { MockChatModel } from "../src/models/mock-model";
import { executeToolCall } from "../src/tools/catalog-tools";

describe("AI Discovery & Catalog Tools", () => {
  let repo: InMemoryCatalogRepository;
  let model: MockChatModel;
  const tenantA = parseTenantId("store_alpha");
  const tenantB = parseTenantId("store_beta");

  beforeEach(async () => {
    repo = new InMemoryCatalogRepository();
    model = new MockChatModel();

    // Seed products for Tenant A
    const shoes = await repo.createProduct({
      tenantId: tenantA,
      name: "Aero Glide Trail Shoes",
      description: "Breathable trail running shoes with grip sole",
      status: "active",
      categories: ["footwear", "running"],
    });

    await repo.createVariant({
      productId: shoes.id,
      tenantId: tenantA,
      sku: "AERO-42-BLU",
      title: "Size 42 / Ocean Blue",
      price: createMoney(12000, "USD"), // $120.00
      inventoryQuantity: 25,
    });

    // Seed products for Tenant B
    await repo.createProduct({
      tenantId: tenantB,
      name: "Secret Beta Sneaker",
      description: "Tenant B exclusive prototype",
      status: "active",
    });
  });

  it("executes search_products with bounded outputs", async () => {
    const rawResult = await executeToolCall(
      "search_products",
      { query: "shoes", limit: 50 }, // Requests 50, but ceiling is 10
      { tenantId: tenantA, catalogRepo: repo }
    );

    const result = JSON.parse(rawResult);
    expect(result.status).toBe("success");
    expect(result.count).toBe(1);
    expect(result.products[0].name).toBe("Aero Glide Trail Shoes");
  });

  it("retrieves product details with variants and stock", async () => {
    const list = await repo.listProducts(tenantA);
    const productId = list.items[0]?.id;
    expect(productId).toBeDefined();

    const rawResult = await executeToolCall(
      "get_product_details",
      { productId },
      { tenantId: tenantA, catalogRepo: repo }
    );

    const result = JSON.parse(rawResult);
    expect(result.status).toBe("success");
    expect(result.product.name).toBe("Aero Glide Trail Shoes");
    expect(result.product.variants.length).toBe(1);
    expect(result.product.variants[0].sku).toBe("AERO-42-BLU");
    expect(result.product.variants[0].price.formatted).toBe("$120.00");
  });

  it("orchestrates grounded discovery conversation end-to-end", async () => {
    const agent = new DiscoveryAgent(model, repo, tenantA);

    const result = await agent.chat("I am looking for trail running shoes");

    expect(result.reply).toContain("Aero Glide Trail Shoes");
    expect(result.toolCallsExecuted.length).toBeGreaterThan(0);
    expect(result.toolCallsExecuted[0]?.name).toBe("search_products");
  });

  it("strictly isolates tenants during AI discovery", async () => {
    // Tenant B asks for shoes (Tenant B does NOT have shoes)
    const agentB = new DiscoveryAgent(model, repo, tenantB);
    const resultB = await agentB.chat("find running shoes");

    // Must NOT reveal Tenant A's Aero Glide shoes
    expect(resultB.reply).not.toContain("Aero Glide");
    expect(resultB.reply).toContain("couldn't find any products");
  });
});
