import {
  type CatalogRepository,
  type Order,
  type OrderRepository,
  createMoney,
} from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import type { createAuthMiddleware } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";

export interface MerchantRoutesDependencies {
  orderRepo: OrderRepository;
  catalogRepo: CatalogRepository;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
}

export function createMerchantRoutes(deps: MerchantRoutesDependencies) {
  const router = new Hono<AppEnv>();

  // All merchant routes require tenant header, authenticated session, and merchant role
  router.use("*", requireTenant);
  router.use("*", deps.authMiddleware.requireAuth);
  router.use("*", deps.authMiddleware.requireRole("merchant"));

  // Merchant Analytics & Sales Metrics
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

    // In a production SQL database, this would be an indexed aggregation query.
    // For our modular repository, we calculate tenant analytics safely.
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
