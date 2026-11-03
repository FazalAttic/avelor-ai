import { beforeEach, describe, expect, it } from "bun:test";
import { createDatabaseClient, DrizzleCatalogRepository } from "@avelor/database";
import { createApp } from "../src/app";

describe("Catalog HTTP API Endpoints", () => {
  let app: ReturnType<typeof createApp>;
  let repo: DrizzleCatalogRepository;

  let tenantA: string;
  let tenantB: string;

  beforeEach(() => {
    const db = createDatabaseClient(
      process.env.DATABASE_URL ?? "postgres://avelor:avelor@localhost:5433/avelor_dev"
    );
    repo = new DrizzleCatalogRepository(db);
    const rand = Math.random().toString(36).substring(2, 9);
    tenantA = `test_cat_a_${rand}`;
    tenantB = `test_cat_b_${rand}`;
    app = createApp({ database: db, catalogRepo: repo });
  });

  it("rejects requests without x-tenant-id header", async () => {
    const res = await app.request("/api/v1/products", {
      method: "GET",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TENANT_ID");
  });

  it("rejects requests with malformed tenant IDs", async () => {
    const res = await app.request("/api/v1/products", {
      method: "GET",
      headers: { "x-tenant-id": "in;jection" },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_TENANT_ID");
  });

  it("creates a product and retrieves it with tenant isolation", async () => {
    // 1. Tenant A creates product
    const createRes = await app.request("/api/v1/products", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Mechanical Keyboard",
        description: "Hot-swappable mechanical keyboard",
        status: "active",
        categories: ["electronics", "keyboards"],
        attributes: { switches: "tactile" },
      }),
    });

    expect(createRes.status).toBe(201);
    const product = await createRes.json();
    expect(product.id).toBeDefined();
    expect(product.name).toBe("Mechanical Keyboard");

    // 2. Tenant A can retrieve the product
    const getResA = await app.request(`/api/v1/products/${product.id}`, {
      headers: { "x-tenant-id": tenantA },
    });
    expect(getResA.status).toBe(200);
    const retrievedA = await getResA.json();
    expect(retrievedA.id).toBe(product.id);

    // 3. Tenant B CANNOT retrieve Tenant A's product (404)
    const getResB = await app.request(`/api/v1/products/${product.id}`, {
      headers: { "x-tenant-id": tenantB },
    });
    expect(getResB.status).toBe(404);
    const errorB = await getResB.json();
    expect(errorB.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("creates variants and updates inventory via HTTP", async () => {
    // Create product
    const prodRes = await app.request("/api/v1/products", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Desk Mat",
        status: "active",
      }),
    });
    const product = await prodRes.json();

    // Create variant
    const variantRes = await app.request(`/api/v1/products/${product.id}/variants`, {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sku: "MAT-GRAY-XL",
        title: "Extra Large / Heather Gray",
        price: { amount: 2900, currency: "USD" }, // $29.00
        inventoryQuantity: 50,
      }),
    });

    expect(variantRes.status).toBe(201);
    const variant = await variantRes.json();
    expect(variant.sku).toBe("MAT-GRAY-XL");
    expect(variant.inventoryQuantity).toBe(50);

    // Update inventory (sell 5 units)
    const updateRes = await app.request(`/api/v1/products/variants/${variant.id}/inventory`, {
      method: "PATCH",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({ delta: -5 }),
    });

    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.inventoryQuantity).toBe(45);

    // Attempt to oversell
    const oversellRes = await app.request(`/api/v1/products/variants/${variant.id}/inventory`, {
      method: "PATCH",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({ delta: -100 }),
    });
    expect(oversellRes.status).toBe(400);
    const oversellBody = await oversellRes.json();
    expect(oversellBody.error.code).toBe("INVENTORY_ERROR");
  });

  it("filters products by search query and category", async () => {
    // Seed 2 products
    await app.request("/api/v1/products", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Wireless Mouse",
        categories: ["electronics"],
        status: "active",
      }),
    });

    await app.request("/api/v1/products", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Ergonomic Chair",
        categories: ["furniture"],
        status: "active",
      }),
    });

    // Query filter
    const searchRes = await app.request("/api/v1/products?q=mouse", {
      headers: { "x-tenant-id": tenantA },
    });
    const searchBody = await searchRes.json();
    expect(searchBody.items.length).toBe(1);
    expect(searchBody.items[0]?.name).toBe("Wireless Mouse");

    // Category filter
    const catRes = await app.request("/api/v1/products?category=furniture", {
      headers: { "x-tenant-id": tenantA },
    });
    const catBody = await catRes.json();
    expect(catBody.items.length).toBe(1);
    expect(catBody.items[0]?.name).toBe("Ergonomic Chair");
  });

  it("hydrates variants when include=variants is requested", async () => {
    const prodRes = await app.request("/api/v1/products", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Desk Mat", status: "active" }),
    });
    const product = await prodRes.json();

    await app.request(`/api/v1/products/${product.id}/variants`, {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sku: "MAT-GRAY-XL",
        title: "Extra Large / Heather Gray",
        price: { amount: 2900, currency: "USD" },
        inventoryQuantity: 50,
      }),
    });

    const plainRes = await app.request("/api/v1/products", {
      headers: { "x-tenant-id": tenantA },
    });
    const plainBody = await plainRes.json();
    expect(plainBody.items[0].variants).toBeUndefined();

    const hydratedRes = await app.request("/api/v1/products?include=variants", {
      headers: { "x-tenant-id": tenantA },
    });
    const hydratedBody = await hydratedRes.json();
    expect(hydratedBody.total).toBe(1);
    expect(hydratedBody.items[0].id).toBe(product.id);
    expect(hydratedBody.items[0].variants.length).toBe(1);
    expect(hydratedBody.items[0].variants[0].sku).toBe("MAT-GRAY-XL");
    expect(hydratedBody.items[0].variants[0].price).toEqual({ amount: 2900, currency: "USD" });
  });
});
