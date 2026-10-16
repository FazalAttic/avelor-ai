import { beforeEach, describe, expect, it } from "bun:test";
import {
  createMoney,
  InMemoryCartRepository,
  InMemoryCatalogRepository,
  parseTenantId,
} from "@avelor/core";
import { createApp } from "../src/app";

describe("Cart HTTP API Endpoints", () => {
  let app: ReturnType<typeof createApp>;
  let catalogRepo: InMemoryCatalogRepository;
  let cartRepo: InMemoryCartRepository;

  const tenantA = "store_alpha";
  const tenantB = "store_beta";
  let variantId: string;

  beforeEach(async () => {
    catalogRepo = new InMemoryCatalogRepository();
    cartRepo = new InMemoryCartRepository();
    app = createApp({ catalogRepo, cartRepo });

    // Seed product and variant
    const product = await catalogRepo.createProduct({
      tenantId: parseTenantId(tenantA),
      name: "Ceramic Coffee Dripper",
      status: "active",
    });

    const variant = await catalogRepo.createVariant({
      productId: product.id,
      tenantId: parseTenantId(tenantA),
      sku: "DRIP-V60-WHT",
      title: "White Ceramic",
      price: createMoney(2800, "USD"), // $28.00
      inventoryQuantity: 10,
    });

    variantId = variant.id;
  });

  it("rejects cart requests without x-tenant-id header", async () => {
    const res = await app.request("/api/v1/carts", { method: "POST" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TENANT_ID");
  });

  it("creates a cart and adds items with live price validation", async () => {
    // 1. Create cart
    const createRes = await app.request("/api/v1/carts", {
      method: "POST",
      headers: { "x-tenant-id": tenantA },
    });
    expect(createRes.status).toBe(201);
    const cart = await createRes.json();
    expect(cart.id).toBeDefined();
    expect(cart.subtotal.amount).toBe(0);

    // 2. Add 2 units of variant ($28.00 x 2 = $56.00 -> 5600 minor units)
    const addRes = await app.request(`/api/v1/carts/${cart.id}/items`, {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        variantId,
        quantity: 2,
      }),
    });

    expect(addRes.status).toBe(200);
    const updated = await addRes.json();
    expect(updated.items.length).toBe(1);
    expect(updated.subtotal.amount).toBe(5600);
    expect(updated.items[0].sku).toBe("DRIP-V60-WHT");
  });

  it("rejects adding more items than available in stock", async () => {
    const createRes = await app.request("/api/v1/carts", {
      method: "POST",
      headers: { "x-tenant-id": tenantA },
    });
    const cart = await createRes.json();

    // Available stock is 10; try adding 15
    const addRes = await app.request(`/api/v1/carts/${cart.id}/items`, {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        variantId,
        quantity: 15,
      }),
    });

    expect(addRes.status).toBe(400);
    const body = await addRes.json();
    expect(body.error.code).toBe("INSUFFICIENT_STOCK");
  });

  it("enforces tenant boundaries on cart operations", async () => {
    const createRes = await app.request("/api/v1/carts", {
      method: "POST",
      headers: { "x-tenant-id": tenantA },
    });
    const cart = await createRes.json();

    // Tenant B cannot retrieve Tenant A's cart
    const getResB = await app.request(`/api/v1/carts/${cart.id}`, {
      headers: { "x-tenant-id": tenantB },
    });
    expect(getResB.status).toBe(404);
  });
});
