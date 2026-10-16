import type { CatalogRepository, OrderRepository } from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import type { createAuthMiddleware } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";

export interface AdminRoutesDependencies {
  orderRepo: OrderRepository;
  catalogRepo: CatalogRepository;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
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

  return router;
}
