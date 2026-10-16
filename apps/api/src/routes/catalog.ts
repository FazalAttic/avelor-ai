import {
  type CatalogRepository,
  type ProductStatus,
  ValidationError,
  createMoney,
} from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import type { createAuthMiddleware } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";

interface CreateProductPayload {
  name: string;
  description?: string;
  status?: ProductStatus;
  categories?: string[];
  attributes?: Record<string, string | number | boolean | string[]>;
  media?: string[];
}

interface CreateVariantPayload {
  sku: string;
  title: string;
  price: {
    amount: number;
    currency: string;
  };
  inventoryQuantity?: number;
  attributes?: Record<string, string | number | boolean | string[]>;
}

interface UpdateInventoryPayload {
  delta: number;
}

export function createCatalogRoutes(
  repo: CatalogRepository,
  authMiddleware?: ReturnType<typeof createAuthMiddleware> | undefined
) {
  const router = new Hono<AppEnv>();

  // All catalog routes require verified tenant scoping
  router.use("*", requireTenant);

  // If merchant auth middleware is configured, protect all mutation methods
  if (authMiddleware) {
    router.post("*", authMiddleware.requireAuth, authMiddleware.requireRole("merchant"));
    router.put("*", authMiddleware.requireAuth, authMiddleware.requireRole("merchant"));
    router.delete("*", authMiddleware.requireAuth, authMiddleware.requireRole("merchant"));
    router.patch("*", authMiddleware.requireAuth, authMiddleware.requireRole("merchant"));
  }

  // List products with filtering
  router.get("/", async (c) => {
    const tenantId = c.get("tenantId");
    const query = c.req.query("q");
    const category = c.req.query("category");
    const status = c.req.query("status") as ProductStatus | undefined;
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : undefined;

    const result = await repo.listProducts(tenantId, {
      query,
      category,
      status,
      limit,
      offset,
    });

    return c.json(result);
  });

  // Get product with its variants
  router.get("/:id", async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id");

    const product = await repo.getProductWithVariants(tenantId, id);
    if (!product) {
      return c.json(
        {
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: `Product '${id}' not found for this tenant`,
          },
        },
        404
      );
    }

    return c.json(product);
  });

  // Create product
  router.post("/", async (c) => {
    const tenantId = c.get("tenantId");

    let body: CreateProductPayload;
    try {
      body = await c.req.json<CreateProductPayload>();
    } catch {
      return c.json(
        {
          error: {
            code: "INVALID_JSON",
            message: "Malformed JSON body",
          },
        },
        400
      );
    }

    try {
      const product = await repo.createProduct({
        tenantId,
        name: body.name,
        description: body.description,
        status: body.status,
        categories: body.categories,
        attributes: body.attributes,
        media: body.media,
      });

      return c.json(product, 201);
    } catch (err) {
      if (err instanceof ValidationError) {
        return c.json({ error: { code: "VALIDATION_ERROR", message: err.message } }, 400);
      }
      throw err;
    }
  });

  // Create variant for product
  router.post("/:id/variants", async (c) => {
    const tenantId = c.get("tenantId");
    const productId = c.req.param("id") ?? "";

    let body: CreateVariantPayload;
    try {
      body = await c.req.json<CreateVariantPayload>();
    } catch {
      return c.json(
        {
          error: {
            code: "INVALID_JSON",
            message: "Malformed JSON body",
          },
        },
        400
      );
    }

    try {
      const price = createMoney(body.price?.amount, body.price?.currency);
      const variant = await repo.createVariant({
        productId,
        tenantId,
        sku: body.sku,
        title: body.title,
        price,
        inventoryQuantity: body.inventoryQuantity ?? 0,
        attributes: body.attributes,
      });

      return c.json(variant, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        err instanceof ValidationError ||
        (err instanceof Error && err.name === "InvalidMoneyAmountError")
      ) {
        return c.json({ error: { code: "VALIDATION_ERROR", message } }, 400);
      }
      return c.json({ error: { code: "CONFLICT", message } }, 409);
    }
  });

  // Update inventory
  router.patch("/variants/:variantId/inventory", async (c) => {
    const tenantId = c.get("tenantId");
    const variantId = c.req.param("variantId") ?? "";

    let body: UpdateInventoryPayload;
    try {
      body = await c.req.json<UpdateInventoryPayload>();
    } catch {
      return c.json(
        {
          error: {
            code: "INVALID_JSON",
            message: "Malformed JSON body",
          },
        },
        400
      );
    }

    if (typeof body.delta !== "number" || !Number.isSafeInteger(body.delta)) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Property 'delta' must be an integer",
          },
        },
        400
      );
    }

    try {
      const updated = await repo.updateInventory(tenantId, variantId, body.delta);
      return c.json(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json(
        {
          error: {
            code: "INVENTORY_ERROR",
            message,
          },
        },
        400
      );
    }
  });

  return router;
}
