import { type EmbeddingModel, reindexCatalog, type VectorStore } from "@avelor/ai";
import {
  type CatalogRepository,
  createMoney,
  type OrderRepository,
  type OrderStatus,
  type PolicyRepository,
  type PolicyTopic,
} from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import type { createAuthMiddleware } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";

export interface AdminRoutesDependencies {
  orderRepo: OrderRepository;
  catalogRepo: CatalogRepository;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  policyRepo?: PolicyRepository | undefined;
  embeddingModel?: EmbeddingModel | undefined;
  vectorStore?: VectorStore | undefined;
}

export function createAdminRoutes(deps: AdminRoutesDependencies) {
  const router = new Hono<AppEnv>();

  // All admin routes strictly enforce:
  // 1. Valid tenant header (x-tenant-id)
  // 2. Authenticated user session
  // 3. User role must be "admin"
  router.use("*", requireTenant);
  router.use("*", deps.authMiddleware.requireAuth);
  router.use("*", deps.authMiddleware.requireRole("admin"));

  // Current admin identity & 2FA status
  router.get("/me", (c) => {
    const user = c.get("user");
    return c.json({
      user,
      tenantId: c.get("tenantId"),
    });
  });

  // Store Analytics & Metrics Overview
  router.get("/metrics", async (c) => {
    const tenantId = c.get("tenantId");

    const productsResult = await deps.catalogRepo.listProducts(tenantId, { limit: 100 });
    const totalProducts = productsResult.total;

    let lowStockCount = 0;
    for (const prod of productsResult.items) {
      const variants = await deps.catalogRepo.listVariants(tenantId, prod.id);
      for (const variant of variants) {
        if (variant.inventoryQuantity < 5) {
          lowStockCount++;
        }
      }
    }

    const orders = await deps.orderRepo.listOrders(tenantId);
    let totalRevenueAmount = 0;
    let paidOrdersCount = 0;

    for (const order of orders) {
      if (order.status === "paid" || order.status === "processing") {
        totalRevenueAmount += order.total.amount;
        paidOrdersCount++;
      }
    }

    return c.json({
      tenantId,
      catalog: {
        totalProducts,
        lowStockVariants: lowStockCount,
      },
      orders: {
        totalOrders: orders.length,
        paidOrders: paidOrdersCount,
        revenue: {
          amount: totalRevenueAmount,
          currency: "USD",
        },
      },
      currency: "USD",
      timestamp: new Date().toISOString(),
    });
  });

  // Products Management
  router.get("/products", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Number(c.req.query("limit") ?? 50);
    const offset = Number(c.req.query("offset") ?? 0);
    const search = c.req.query("q") ?? undefined;
    const category = c.req.query("category") ?? undefined;

    const result = await deps.catalogRepo.listProducts(tenantId, {
      limit,
      offset,
      query: search,
      category,
    });

    // Attach variants for complete admin inspection
    const productsWithVariants = await Promise.all(
      result.items.map(async (p) => {
        const variants = await deps.catalogRepo.listVariants(tenantId, p.id);
        return {
          ...p,
          variants,
        };
      })
    );

    return c.json({
      items: productsWithVariants,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  });

  router.post("/products", async (c) => {
    const tenantId = c.get("tenantId");

    let body: {
      name: string;
      description?: string;
      categories?: string[];
      attributes?: Record<string, string>;
      variants?: {
        sku: string;
        title?: string;
        priceAmount: number;
        currency?: string;
        inventoryQuantity: number;
      }[];
    };

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } }, 400);
    }

    if (!body.name) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "Product 'name' is required" } },
        400
      );
    }

    const product = await deps.catalogRepo.createProduct({
      tenantId,
      name: body.name,
      description: body.description ?? "",
      categories: body.categories ?? [],
      attributes: body.attributes ?? {},
      status: "active",
    });

    const createdVariants = [];
    if (body.variants && body.variants.length > 0) {
      for (const v of body.variants) {
        const variant = await deps.catalogRepo.createVariant({
          tenantId,
          productId: product.id,
          sku: v.sku,
          title: v.title ?? v.sku,
          price: createMoney(v.priceAmount, v.currency ?? "USD"),
          inventoryQuantity: v.inventoryQuantity ?? 0,
        });
        createdVariants.push(variant);
      }
    }

    return c.json({ ...product, variants: createdVariants }, 201);
  });

  router.get("/products/:id", async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id");

    const product = await deps.catalogRepo.getProductWithVariants(tenantId, id);
    if (!product) {
      return c.json({ error: { code: "NOT_FOUND", message: `Product '${id}' not found` } }, 404);
    }

    return c.json(product);
  });

  router.patch("/products/:id", async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id");

    let body: {
      name?: string;
      description?: string;
      categories?: string[];
      attributes?: Record<string, string>;
      status?: "draft" | "active" | "archived";
    };

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } }, 400);
    }

    try {
      const updated = await deps.catalogRepo.updateProduct(tenantId, id, body);
      return c.json(updated);
    } catch {
      return c.json({ error: { code: "NOT_FOUND", message: `Product '${id}' not found` } }, 404);
    }
  });

  router.delete("/products/:id", async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id");

    const deleted = await deps.catalogRepo.deleteProduct(tenantId, id);
    if (!deleted) {
      return c.json({ error: { code: "NOT_FOUND", message: `Product '${id}' not found` } }, 404);
    }

    return c.json({ status: "deleted", id });
  });

  // Orders Management
  router.get("/orders", async (c) => {
    const tenantId = c.get("tenantId");
    const orders = await deps.orderRepo.listOrders(tenantId);
    return c.json({ orders });
  });

  router.get("/orders/:id", async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id");

    const order = await deps.orderRepo.getOrder(tenantId, id);
    if (!order) {
      return c.json({ error: { code: "NOT_FOUND", message: `Order '${id}' not found` } }, 404);
    }

    return c.json(order);
  });

  router.patch("/orders/:id/status", async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id");

    let body: { status: OrderStatus };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } }, 400);
    }

    if (!body.status) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "Target status is required" } },
        400
      );
    }

    try {
      const updated = await deps.orderRepo.updateOrderStatus(tenantId, id, body.status);
      return c.json(updated);
    } catch (err) {
      return c.json(
        {
          error: {
            code: "TRANSITION_ERROR",
            message: err instanceof Error ? err.message : "Invalid status transition",
          },
        },
        400
      );
    }
  });

  // Catalog Re-indexing for AI Semantic Search
  router.post("/reindex", async (c) => {
    const tenantId = c.get("tenantId");

    if (!deps.embeddingModel || !deps.vectorStore) {
      return c.json(
        {
          error: {
            code: "VECTOR_SEARCH_DISABLED",
            message: "Embedding model and vector store are not configured on this instance",
          },
        },
        400
      );
    }

    const result = await reindexCatalog({
      tenantId,
      catalogRepo: deps.catalogRepo,
      embeddingModel: deps.embeddingModel,
      vectorStore: deps.vectorStore,
    });

    return c.json({
      status: "success",
      tenantId,
      totalIndexed: result.totalIndexed,
      durationMs: result.durationMs,
    });
  });

  // Store Policy Management (AI RAG Knowledge)
  router.get("/policies", async (c) => {
    const tenantId = c.get("tenantId");
    if (!deps.policyRepo) {
      return c.json([]);
    }
    const policies = await deps.policyRepo.listPolicies(tenantId);
    return c.json(policies);
  });

  router.put("/policies/:topic", async (c) => {
    const tenantId = c.get("tenantId");
    const rawTopic = c.req.param("topic");
    const validTopics: PolicyTopic[] = [
      "returns",
      "shipping",
      "privacy",
      "terms",
      "faq",
      "general",
    ];

    if (!validTopics.includes(rawTopic as PolicyTopic)) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid policy topic '${rawTopic}'. Allowed: ${validTopics.join(", ")}`,
          },
        },
        400
      );
    }

    const topic = rawTopic as PolicyTopic;

    if (!deps.policyRepo) {
      return c.json(
        { error: { code: "NOT_CONFIGURED", message: "Policy repository is not configured" } },
        400
      );
    }

    let body: { title?: string; content?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } }, 400);
    }

    if (!body.title || !body.content) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "Both 'title' and 'content' are required" } },
        400
      );
    }

    const policy = await deps.policyRepo.upsertPolicy(tenantId, {
      topic,
      title: body.title,
      content: body.content,
    });

    return c.json(policy);
  });

  return router;
}
