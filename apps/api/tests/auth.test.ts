import { beforeEach, describe, expect, it } from "bun:test";
import { MockEmbeddingModel } from "@avelor/ai";
import { InMemoryCartRepository, parseTenantId } from "@avelor/core";
import {
  createDatabaseClient,
  DrizzleCatalogRepository,
  DrizzleOrderRepository,
  PgVectorStore,
} from "@avelor/database";
import { createApp } from "../src/app";
import { createAuth } from "../src/auth";

describe("Better Auth & Admin / Customer Role Isolation", () => {
  let app: ReturnType<typeof createApp>;
  let catalogRepo: DrizzleCatalogRepository;
  let cartRepo: InMemoryCartRepository;
  let orderRepo: DrizzleOrderRepository;
  let auth: ReturnType<typeof createAuth>;

  let tenantA: string;
  let tenantB: string;

  let adminEmailA: string;
  let adminTokenA: string;
  let adminTokenB: string;
  let customerToken: string;

  beforeEach(async () => {
    const db = createDatabaseClient(
      process.env.DATABASE_URL ?? "postgres://avelor:avelor@localhost:5433/avelor_dev"
    );
    catalogRepo = new DrizzleCatalogRepository(db);
    cartRepo = new InMemoryCartRepository();
    orderRepo = new DrizzleOrderRepository(db);
    auth = createAuth({ database: db, secret: "test_secret_for_auth_32_characters_long" });

    const rand = Math.random().toString(36).substring(2, 9);
    tenantA = `test_alpha_${rand}`;
    tenantB = `test_beta_${rand}`;
    adminEmailA = `adminA_${rand}@store.com`;

    const embeddingModel = new MockEmbeddingModel(1536);
    const vectorStore = new PgVectorStore(db);

    app = createApp({
      database: db,
      catalogRepo,
      cartRepo,
      orderRepo,
      auth,
      embeddingModel,
      vectorStore,
      enforceAdminAuth: true,
    });

    // 1. Sign up Admin A (scoped to tenantA)
    const adminResA = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: adminEmailA,
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
        email: `adminB_${rand}@store.com`,
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
        email: `customer_${rand}@shopper.com`,
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

    it("blocks customer from triggering semantic catalog reindexing", async () => {
      const res = await app.request("/api/v1/admin/reindex", {
        method: "POST",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${customerToken}`,
        },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("allows authenticated Admin A to trigger catalog reindexing", async () => {
      // Seed a product
      await catalogRepo.createProduct({
        tenantId: parseTenantId(tenantA),
        name: "Mountain Rain Coat",
        description: "Waterproof technical outer jacket",
        status: "active",
      });

      const res = await app.request("/api/v1/admin/reindex", {
        method: "POST",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${adminTokenA}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("success");
      expect(body.tenantId).toBe(tenantA);
      expect(body.totalIndexed).toBe(1);
      expect(body.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("blocks customers from accessing or modifying admin policies", async () => {
      const getRes = await app.request("/api/v1/admin/policies", {
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${customerToken}`,
        },
      });
      expect(getRes.status).toBe(403);

      const putRes = await app.request("/api/v1/admin/policies/returns", {
        method: "PUT",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${customerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Malicious Customer Policy",
          content: "Free items for everyone.",
        }),
      });
      expect(putRes.status).toBe(403);
    });

    it("allows authenticated Admin A to create and list store policies", async () => {
      const putRes = await app.request("/api/v1/admin/policies/returns", {
        method: "PUT",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${adminTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Official 45-Day Returns",
          content: "Return any product within 45 days for full refund.",
        }),
      });

      expect(putRes.status).toBe(200);
      const putBody = await putRes.json();
      expect(putBody.topic).toBe("returns");
      expect(putBody.title).toBe("Official 45-Day Returns");

      const getRes = await app.request("/api/v1/admin/policies", {
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${adminTokenA}`,
        },
      });

      expect(getRes.status).toBe(200);
      const policies = await getRes.json();
      expect(Array.isArray(policies)).toBe(true);
      expect(policies.length).toBe(1);
      expect(policies[0].topic).toBe("returns");
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

    it("serves GET /api/v1/admin/me with current admin user profile", async () => {
      const res = await app.request("/api/v1/admin/me", {
        method: "GET",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${adminTokenA}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.email).toBe(adminEmailA.toLowerCase());
      expect(body.user.role).toBe("admin");
      expect(body.tenantId).toBe(tenantA);
    });

    it("allows admin to create and list products via /api/v1/admin/products", async () => {
      const createRes = await app.request("/api/v1/admin/products", {
        method: "POST",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${adminTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Admin Leather Boots",
          description: "Premium boots",
          categories: ["footwear"],
          variants: [
            {
              sku: "BOOT-42",
              priceAmount: 18900,
              currency: "USD",
              inventoryQuantity: 20,
            },
          ],
        }),
      });

      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      expect(created.name).toBe("Admin Leather Boots");
      expect(created.variants).toHaveLength(1);
      expect(created.variants[0].sku).toBe("BOOT-42");

      const listRes = await app.request("/api/v1/admin/products", {
        method: "GET",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${adminTokenA}`,
        },
      });

      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.total).toBeGreaterThanOrEqual(1);
    });

    it("allows admin to list store orders via /api/v1/admin/orders", async () => {
      const res = await app.request("/api/v1/admin/orders", {
        method: "GET",
        headers: {
          "x-tenant-id": tenantA,
          authorization: `Bearer ${adminTokenA}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.orders)).toBe(true);
    });

    it("exposes two-factor authentication endpoints via Better Auth", async () => {
      const res = await app.request("/api/auth/two-factor/enable", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          password: "Password123!",
        }),
      });

      // Returns 200 with TOTP URI and backup codes for Google Authenticator
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totpURI).toBeDefined();
      expect(data.totpURI).toContain("otpauth://totp/");
      expect(Array.isArray(data.backupCodes)).toBe(true);
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

  describe("Social Authentication (Google OAuth)", () => {
    it("configures Google provider and initiates OAuth flow when credentials are provided", async () => {
      const googleAuth = createAuth({
        secret: "test_secret_for_auth_32_characters_long",
        googleClientId: "mock-google-client-id.apps.googleusercontent.com",
        googleClientSecret: "mock-google-client-secret",
      });

      expect(googleAuth.options.account?.accountLinking?.enabled).toBe(true);
      expect(googleAuth.options.account?.accountLinking?.trustedProviders).toContain("google");
      expect(googleAuth.options.account?.accountLinking?.updateUserInfoOnLink).toBe(true);

      const socialApp = createApp({
        auth: googleAuth,
      });

      const res = await socialApp.request("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "http://localhost:3000",
        }),
      });

      expect([200, 302]).toContain(res.status);
      const data = await res.json();
      expect(data.url).toBeDefined();
      expect(data.url).toContain("accounts.google.com");
    });

    it("handles root endpoint by redirecting browsers to storefront and responding JSON to API clients", async () => {
      const app = createApp();

      // Browser request (accept: text/html)
      const browserRes = await app.request("/", {
        headers: { accept: "text/html,application/xhtml+xml" },
      });
      expect(browserRes.status).toBe(302);
      expect(browserRes.headers.get("location")).toBe("http://localhost:3000");

      // API client request
      const apiRes = await app.request("/", {
        headers: { accept: "application/json" },
      });
      expect(apiRes.status).toBe(200);
      const data = await apiRes.json();
      expect(data.name).toBe("Avelor API");
      expect(data.status).toBe("ok");
    });
  });
});
