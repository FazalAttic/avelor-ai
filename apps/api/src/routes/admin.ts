import { type EmbeddingModel, reindexCatalog, type VectorStore } from "@avelor/ai";
import type {
  CatalogRepository,
  OrderRepository,
  PolicyRepository,
  PolicyTopic,
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

  // All admin routes require store tenant header, authenticated session, and admin role
  router.use("*", requireTenant);
  router.use("*", deps.authMiddleware.requireAuth);
  router.use("*", deps.authMiddleware.requireRole("admin"));

  // Store Admin Analytics & Inventory Metrics
  router.get("/metrics", async (c) => {
    const tenantId = c.get("tenantId");

    // Retrieve catalog summary
    const productsResult = await deps.catalogRepo.listProducts(tenantId, { limit: 100 });
    const totalProducts = productsResult.total;

    // Calculate low stock items (< 5 units)
    let lowStockCount = 0;
    for (const prod of productsResult.items) {
      const variants = await deps.catalogRepo.listVariants(tenantId, prod.id);
      for (const variant of variants) {
        if (variant.inventoryQuantity < 5) {
          lowStockCount++;
        }
      }
    }

    return c.json({
      tenantId,
      catalog: {
        totalProducts,
        lowStockVariants: lowStockCount,
      },
      currency: "USD",
      timestamp: new Date().toISOString(),
    });
  });

  // Store Admin Catalog Re-indexing for Semantic Search
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

  // Store Admin Policy Management (Knowledge RAG)
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
