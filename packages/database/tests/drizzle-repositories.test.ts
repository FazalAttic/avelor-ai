import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createMoney, parseTenantId } from "@avelor/core";
import { eq } from "drizzle-orm";
import {
  conversations,
  createDatabaseClient,
  type Database,
  DrizzleCatalogRepository,
  DrizzleConversationRepository,
  DrizzleOrderRepository,
  DrizzlePolicyRepository,
  orders,
  PgVectorStore,
  products,
  storePolicies,
} from "../src/index";

describe("Drizzle Repositories (PostgreSQL Integration)", () => {
  const dbUrl = process.env.DATABASE_URL ?? "postgres://avelor:avelor@localhost:5433/avelor_dev";
  let db: Database;
  let catalogRepo: DrizzleCatalogRepository;
  let orderRepo: DrizzleOrderRepository;
  let policyRepo: DrizzlePolicyRepository;
  let convRepo: DrizzleConversationRepository;
  const testTenant = parseTenantId(`store_test_${Date.now()}`);

  beforeAll(() => {
    db = createDatabaseClient(dbUrl);
    catalogRepo = new DrizzleCatalogRepository(db);
    orderRepo = new DrizzleOrderRepository(db);
    policyRepo = new DrizzlePolicyRepository(db);
    convRepo = new DrizzleConversationRepository(db);
  });

  afterAll(async () => {
    // Clean up test tenant records
    await db.delete(products).where(eq(products.tenantId, testTenant));
    await db.delete(orders).where(eq(orders.tenantId, testTenant));
    await db.delete(storePolicies).where(eq(storePolicies.tenantId, testTenant));
    await db.delete(conversations).where(eq(conversations.tenantId, testTenant));
  });

  describe("DrizzleCatalogRepository", () => {
    let createdProdId: string;
    let createdVarId: string;

    it("creates a product with tenant scoping", async () => {
      const prod = await catalogRepo.createProduct({
        tenantId: testTenant,
        name: "Test Carbon Runner",
        description: "Carbon plated ultra shoe",
        categories: ["Footwear", "Running"],
        attributes: { weight: "210g" },
        status: "active",
      });

      expect(prod.id).toBeDefined();
      expect(prod.name).toBe("Test Carbon Runner");
      expect(prod.tenantId).toBe(testTenant);
      expect(prod.categories).toEqual(["Footwear", "Running"]);
      createdProdId = prod.id;
    });

    it("fetches product by ID with tenant isolation", async () => {
      const prod = await catalogRepo.getProduct(testTenant, createdProdId);
      expect(prod).not.toBeNull();
      expect(prod?.id).toBe(createdProdId);

      const otherTenant = parseTenantId("store_other");
      const crossTenant = await catalogRepo.getProduct(otherTenant, createdProdId);
      expect(crossTenant).toBeNull();
    });

    it("creates a variant for the product", async () => {
      const variant = await catalogRepo.createVariant({
        tenantId: testTenant,
        productId: createdProdId,
        sku: `CRBN-42-${Date.now()}`,
        title: "Size 42 / Black",
        price: createMoney(14900, "USD"),
        inventoryQuantity: 25,
      });

      expect(variant.id).toBeDefined();
      expect(variant.price.amount).toBe(14900);
      expect(variant.price.currency).toBe("USD");
      expect(variant.inventoryQuantity).toBe(25);
      createdVarId = variant.id;
    });

    it("lists products and filters by category and query", async () => {
      const list = await catalogRepo.listProducts(testTenant, {
        category: "Footwear",
        query: "Carbon",
      });

      expect(list.total).toBeGreaterThanOrEqual(1);
      expect(list.items.some((p) => p.id === createdProdId)).toBe(true);
    });

    it("updates product details and inventory delta", async () => {
      const updated = await catalogRepo.updateProduct(testTenant, createdProdId, {
        name: "Test Carbon Runner V2",
      });
      expect(updated.name).toBe("Test Carbon Runner V2");

      const invUpdated = await catalogRepo.updateInventory(testTenant, createdVarId, -5);
      expect(invUpdated.inventoryQuantity).toBe(20);

      // Inventory decrement beyond zero must throw
      expect(catalogRepo.updateInventory(testTenant, createdVarId, -100)).rejects.toThrow();
    });

    it("fetches product with variants", async () => {
      const full = await catalogRepo.getProductWithVariants(testTenant, createdProdId);
      expect(full).not.toBeNull();
      expect(full?.variants.length).toBeGreaterThanOrEqual(1);
      expect(full?.variants[0]?.id).toBe(createdVarId);
    });

    it("works with PgVectorStore upsert and search", async () => {
      const vectorStore = new PgVectorStore(db);
      const dummyVector = new Array(1536).fill(0.01);
      dummyVector[0] = 0.9;

      await vectorStore.upsert([
        {
          id: createdProdId,
          tenantId: testTenant,
          vector: dummyVector,
          metadata: { name: "Test Carbon Runner" },
        },
      ]);

      const results = await vectorStore.search(dummyVector, {
        tenantId: testTenant,
        topK: 5,
        minScore: 0.5,
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]?.id).toBe(createdProdId);
      expect(results[0]?.score).toBeGreaterThan(0.9);
    });
  });

  describe("DrizzlePolicyRepository", () => {
    it("upserts and retrieves store policies", async () => {
      const created = await policyRepo.upsertPolicy(testTenant, {
        topic: "returns",
        title: "30-Day Policy",
        content: "Return any product within 30 days.",
      });

      expect(created.topic).toBe("returns");
      expect(created.title).toBe("30-Day Policy");

      const fetched = await policyRepo.getPolicy(testTenant, "returns");
      expect(fetched?.content).toBe("Return any product within 30 days.");

      const all = await policyRepo.listPolicies(testTenant);
      expect(all.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("DrizzleOrderRepository", () => {
    it("creates orders and transitions status", async () => {
      const order = await orderRepo.createOrder({
        tenantId: testTenant,
        cartId: "cart_test_123",
        customerEmail: "shopper@example.com",
        items: [
          {
            variantId: "var_test",
            productId: "prod_test",
            sku: "TEST-SKU",
            title: "Test Item",
            unitPrice: createMoney(2500, "USD"),
            quantity: 2,
            totalPrice: createMoney(5000, "USD"),
          },
        ],
        total: createMoney(5000, "USD"),
      });

      expect(order.id).toBeDefined();
      expect(order.status).toBe("pending");
      expect(order.items.length).toBe(1);

      const updated = await orderRepo.updateOrderStatus(testTenant, order.id, "paid", "ps_test_1");
      expect(updated.status).toBe("paid");
      expect(updated.paymentSessionId).toBe("ps_test_1");

      const fetched = await orderRepo.getOrder(testTenant, order.id);
      expect(fetched?.status).toBe("paid");
    });
  });

  describe("DrizzleConversationRepository", () => {
    let convId: string;

    it("creates a conversation and appends messages with resilience", async () => {
      const conv = await convRepo.createConversation({
        tenantId: testTenant,
        title: "Shopper Chat",
      });
      expect(conv.id).toBeDefined();
      expect(conv.title).toBe("Shopper Chat");
      convId = conv.id;

      const userMsg = await convRepo.appendMessage(testTenant, {
        conversationId: convId,
        role: "user",
        content: "Looking for trail shoes",
      });
      expect(userMsg.id).toBeDefined();
      expect(userMsg.role).toBe("user");

      const botMsg = await convRepo.appendMessage(testTenant, {
        conversationId: convId,
        role: "assistant",
        content: "Here are the trail shoes in stock.",
      });
      expect(botMsg.id).toBeDefined();

      const full = await convRepo.getConversation(testTenant, convId);
      expect(full).not.toBeNull();
      expect(full?.messages.length).toBe(2);

      // Auto-creates missing conversation on appendMessage without throwing
      const phantomMsg = await convRepo.appendMessage(testTenant, {
        conversationId: "conv_phantom_test_123",
        role: "user",
        content: "Hello from resurrected conversation",
      });
      expect(phantomMsg.conversationId).toBe("conv_phantom_test_123");
    });
  });
});
