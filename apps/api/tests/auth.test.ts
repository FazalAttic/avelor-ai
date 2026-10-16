import { beforeEach, describe, expect, it } from "bun:test";
import {
  InMemoryCartRepository,
  InMemoryCatalogRepository,
  InMemoryOrderRepository,
  parseTenantId,
} from "@avelor/core";
import { createApp } from "../src/app";
import { createAuth } from "../src/auth";

describe("Better Auth & Admin / Customer Role Isolation", () => {
  let app: ReturnType<typeof createApp>;
  let catalogRepo: InMemoryCatalogRepository;
  let cartRepo: InMemoryCartRepository;
  let orderRepo: InMemoryOrderRepository;
  let auth: ReturnType<typeof createAuth>;

  const tenantA = "store_alpha";
  const tenantB = "store_beta";

  let adminTokenA: string;
  let adminTokenB: string;
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
      enforceAdminAuth: true,
    });

    // 1. Sign up Admin A (scoped to tenantA)
    const adminResA = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "adminA@store.com",
        password: "Password123!",
        name: "Admin Alpha",
        role: "admin",
        tenantId: tenantA,
      }),
    });
    expect(adminResA.status).toBe(200);
    const adminDataA = await adminResA.json();
    adminTokenA = adminDataA.token;

    // 2. Sign up Admin B (scoped to tenantB)
    const adminResB = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "adminB@store.com",
        password: "Password123!",
        name: "Admin Beta",
        role: "admin",
        tenantId: tenantB,
      }),
    });
    expect(adminResB.status).toBe(200);
    const adminDataB = await adminResB.json();
    adminTokenB = adminDataB.token;

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

  describe("Store Admin Dashboard & Metrics (/api/v1/admin/metrics)", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await app.request("/api/v1/admin/metrics", {
        headers: { "x-tenant-id": tenantA },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects customer accounts with 403 Forbidden", async () => {
      const res = await app.request("/api/v1/admin/metrics", {
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${customerToken}`,
        },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("admin");
    });

    it("rejects Admin B attempting to access Store A metrics (cross-tenant attack)", async () => {
      const res = await app.request("/api/v1/admin/metrics", {
        headers: {
          "x-tenant-id": tenantA, // Target Store A
          authorization: `Bearer ${adminTokenB}`, // But authenticated as Store B admin
        },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("TENANT_MISMATCH");
    });

    it("allows authenticated Admin A to access Store A metrics", async () => {
      const res = await app.request("/api/v1/admin/metrics", {
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${adminTokenA}`,
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

    it("allows authenticated Admin A to create products for Store A", async () => {
      const res = await app.request("/api/v1/products", {
        method: "POST",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${adminTokenA}`,
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
