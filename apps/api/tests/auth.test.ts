import { beforeEach, describe, expect, it } from "bun:test";
import {
  InMemoryCartRepository,
  InMemoryCatalogRepository,
  InMemoryOrderRepository,
  createMoney,
  parseTenantId,
} from "@avelor/core";
import { createApp } from "../src/app";
import { createAuth } from "../src/auth";

describe("Better Auth & Merchant / Customer Role Isolation", () => {
  let app: ReturnType<typeof createApp>;
  let catalogRepo: InMemoryCatalogRepository;
  let cartRepo: InMemoryCartRepository;
  let orderRepo: InMemoryOrderRepository;
  let auth: ReturnType<typeof createAuth>;

  const tenantA = "store_alpha";
  const tenantB = "store_beta";

  let merchantTokenA: string;
  let merchantTokenB: string;
  let customerToken: string;

  beforeEach(async () => {
    catalogRepo = new InMemoryCatalogRepository();
    cartRepo = new InMemoryCartRepository();
    orderRepo = new InMemoryOrderRepository();
    auth = createAuth({ secret: "test_secret_for_auth_32_characters_long" });

    app = createApp({
      catalogRepo,
      cartRepo,
      orderRepo,
      auth,
      enforceMerchantAuth: true,
    });

    // 1. Sign up Merchant A (scoped to tenantA)
    const merchantResA = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "merchantA@store.com",
        password: "Password123!",
        name: "Merchant Alpha",
        role: "merchant",
        tenantId: tenantA,
      }),
    });
    expect(merchantResA.status).toBe(200);
    const merchantDataA = await merchantResA.json();
    merchantTokenA = merchantDataA.token;

    // 2. Sign up Merchant B (scoped to tenantB)
    const merchantResB = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "merchantB@store.com",
        password: "Password123!",
        name: "Merchant Beta",
        role: "merchant",
        tenantId: tenantB,
      }),
    });
    expect(merchantResB.status).toBe(200);
    const merchantDataB = await merchantResB.json();
    merchantTokenB = merchantDataB.token;

    // 3. Sign up Customer (public shopper, role = customer)
    const customerRes = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "customer@shopper.com",
        password: "Password123!",
        name: "Alice Customer",
        role: "customer",
      }),
    });
    expect(customerRes.status).toBe(200);
    const customerData = await customerRes.json();
    customerToken = customerData.token;
  });

  describe("Merchant Dashboard & Metrics (/api/v1/merchant/metrics)", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await app.request("/api/v1/merchant/metrics", {
        headers: { "x-tenant-id": tenantA },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects customer accounts with 403 Forbidden", async () => {
      const res = await app.request("/api/v1/merchant/metrics", {
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${customerToken}`,
        },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("merchant");
    });

    it("rejects Merchant B attempting to access Store A metrics (cross-tenant attack)", async () => {
      const res = await app.request("/api/v1/merchant/metrics", {
        headers: {
          "x-tenant-id": tenantA, // Target Store A
          authorization: `Bearer ${merchantTokenB}`, // But authenticated as Store B merchant
        },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("TENANT_MISMATCH");
    });

    it("allows authenticated Merchant A to access Store A metrics", async () => {
      const res = await app.request("/api/v1/merchant/metrics", {
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${merchantTokenA}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tenantId).toBe(tenantA);
      expect(body.catalog).toBeDefined();
      expect(body.catalog.totalProducts).toBe(0);
    });
  });

  describe("Catalog Mutation Security (POST /api/v1/products)", () => {
    it("blocks customers from creating products", async () => {
      const res = await app.request("/api/v1/products", {
        method: "POST",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${customerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Malicious Free Item",
          status: "active",
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("blocks unauthenticated callers from creating products", async () => {
      const res = await app.request("/api/v1/products", {
        method: "POST",
        headers: {
          "x-tenant-id": tenantA,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Unauthenticated Item",
          status: "active",
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("allows authenticated Merchant A to create products for Store A", async () => {
      const res = await app.request("/api/v1/products", {
        method: "POST",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${merchantTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Official Espresso Beans",
          status: "active",
          categories: ["coffee"],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Official Espresso Beans");
    });
  });

  describe("Public Shopper Catalog Browsing (GET /api/v1/products)", () => {
    it("allows unauthenticated customers to browse active products", async () => {
      // Seed a product
      await catalogRepo.createProduct({
        tenantId: parseTenantId(tenantA),
        name: "Public Trail Shoes",
        status: "active",
      });

      const res = await app.request("/api/v1/products", {
        method: "GET",
        headers: { "x-tenant-id": tenantA },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items.length).toBe(1);
      expect(body.items[0].name).toBe("Public Trail Shoes");
    });
  });
});
