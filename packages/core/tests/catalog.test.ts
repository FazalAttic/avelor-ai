import { beforeEach, describe, expect, it } from "bun:test";
import { createMoney, InMemoryCatalogRepository, parseTenantId } from "../src/index";

describe("Catalog Repository & Domain Rules", () => {
  let repo: InMemoryCatalogRepository;
  const tenantA = parseTenantId("store_alpha");
  const tenantB = parseTenantId("store_beta");

  beforeEach(() => {
    repo = new InMemoryCatalogRepository();
  });

  it("creates and retrieves a product with attributes", async () => {
    const product = await repo.createProduct({
      tenantId: tenantA,
      name: "Running Shoes",
      description: "Lightweight trail running shoes",
      status: "active",
      categories: ["footwear", "sports"],
      attributes: {
        color: "blue",
        waterproof: true,
      },
    });

    expect(product.id).toBeDefined();
    expect(product.name).toBe("Running Shoes");
    expect(product.attributes.color).toBe("blue");

    const fetched = await repo.getProduct(tenantA, product.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(product.id);
  });

  it("enforces strict tenant isolation across products", async () => {
    const productA = await repo.createProduct({
      tenantId: tenantA,
      name: "Tenant A Secret Product",
    });

    // Tenant B cannot retrieve Tenant A's product
    const crossTenantFetch = await repo.getProduct(tenantB, productA.id);
    expect(crossTenantFetch).toBeNull();

    // Tenant B cannot update Tenant A's product
    await expect(repo.updateProduct(tenantB, productA.id, { name: "Hijacked" })).rejects.toThrow();

    // Tenant B cannot delete Tenant A's product
    const deleteSuccess = await repo.deleteProduct(tenantB, productA.id);
    expect(deleteSuccess).toBe(false);

    // Tenant B listing only includes Tenant B's products
    await repo.createProduct({
      tenantId: tenantB,
      name: "Tenant B Product",
    });

    const listA = await repo.listProducts(tenantA);
    const listB = await repo.listProducts(tenantB);

    expect(listA.items.length).toBe(1);
    expect(listA.items[0]?.name).toBe("Tenant A Secret Product");

    expect(listB.items.length).toBe(1);
    expect(listB.items[0]?.name).toBe("Tenant B Product");
  });

  it("creates variants and updates inventory atomically", async () => {
    const product = await repo.createProduct({
      tenantId: tenantA,
      name: "Merino Wool Hoodie",
      status: "active",
    });

    const variant = await repo.createVariant({
      productId: product.id,
      tenantId: tenantA,
      sku: "HOODIE-M-BLK",
      title: "Size Medium / Black",
      price: createMoney(8900, "USD"), // $89.00
      inventoryQuantity: 15,
      attributes: { size: "M", color: "black" },
    });

    expect(variant.id).toBeDefined();
    expect(variant.inventoryQuantity).toBe(15);
    expect(variant.price.amount).toBe(8900);

    // Deduct inventory
    const afterSale = await repo.updateInventory(tenantA, variant.id, -5);
    expect(afterSale.inventoryQuantity).toBe(10);

    // Prevent overselling below zero
    await expect(repo.updateInventory(tenantA, variant.id, -20)).rejects.toThrow(
      /Insufficient inventory/
    );

    // ProductWithVariants returns variants attached
    const withVariants = await repo.getProductWithVariants(tenantA, product.id);
    expect(withVariants?.variants.length).toBe(1);
    expect(withVariants?.variants[0]?.sku).toBe("HOODIE-M-BLK");
  });

  it("filters and searches products accurately", async () => {
    await repo.createProduct({
      tenantId: tenantA,
      name: "Espresso Machine",
      description: "Brews premium coffee shots",
      categories: ["appliances", "coffee"],
      status: "active",
    });

    await repo.createProduct({
      tenantId: tenantA,
      name: "Pour-over Dripper",
      description: "Ceramic manual coffee dripper",
      categories: ["coffee"],
      status: "active",
    });

    await repo.createProduct({
      tenantId: tenantA,
      name: "Draft Grinder",
      description: "Burr grinder in development",
      categories: ["coffee"],
      status: "draft",
    });

    // Query text search
    const coffeeSearch = await repo.listProducts(tenantA, { query: "espresso" });
    expect(coffeeSearch.items.length).toBe(1);
    expect(coffeeSearch.items[0]?.name).toBe("Espresso Machine");

    // Category filter
    const appliances = await repo.listProducts(tenantA, { category: "appliances" });
    expect(appliances.items.length).toBe(1);

    // Status filter
    const activeCoffee = await repo.listProducts(tenantA, {
      category: "coffee",
      status: "active",
    });
    expect(activeCoffee.items.length).toBe(2);
  });
});
