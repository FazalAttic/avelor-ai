import { type CartRepository, type CatalogRepository, createMoney } from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { requireTenant } from "../middleware/tenant";

interface CreateCartPayload {
  currency?: string | undefined;
}

interface AddItemPayload {
  variantId: string;
  quantity: number;
}

export function createCartRoutes(cartRepo: CartRepository, catalogRepo: CatalogRepository) {
  const router = new Hono<AppEnv>();

  router.use("*", requireTenant);

  // Create new cart
  router.post("/", async (c) => {
    const tenantId = c.get("tenantId");

    let body: CreateCartPayload = {};
    try {
      body = await c.req.json<CreateCartPayload>();
    } catch {
      // Empty body is allowed, defaults to USD
    }

    const cart = await cartRepo.createCart(tenantId, body.currency ?? "USD");
    return c.json(cart, 201);
  });

  // Get cart
  router.get("/:id", async (c) => {
    const tenantId = c.get("tenantId");
    const cartId = c.req.param("id");

    const cart = await cartRepo.getCart(tenantId, cartId);
    if (!cart) {
      return c.json(
        {
          error: {
            code: "CART_NOT_FOUND",
            message: `Cart '${cartId}' not found for this tenant`,
          },
        },
        404
      );
    }

    return c.json(cart);
  });

  // Add item to cart with authoritative server-side price & stock verification
  router.post("/:id/items", async (c) => {
    const tenantId = c.get("tenantId");
    const cartId = c.req.param("id");

    let body: AddItemPayload;
    try {
      body = await c.req.json<AddItemPayload>();
    } catch {
      return c.json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } }, 400);
    }

    if (!body.variantId || typeof body.variantId !== "string") {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "variantId is required" } }, 400);
    }

    if (!Number.isSafeInteger(body.quantity) || body.quantity <= 0) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "quantity must be a positive integer" } },
        400
      );
    }

    // 1. Authoritative check: load variant from source of truth
    const variant = await catalogRepo.getVariant(tenantId, body.variantId);
    if (!variant) {
      return c.json(
        {
          error: {
            code: "VARIANT_NOT_FOUND",
            message: `Variant '${body.variantId}' not found`,
          },
        },
        404
      );
    }

    // 2. Check stock availability
    if (variant.inventoryQuantity < body.quantity) {
      return c.json(
        {
          error: {
            code: "INSUFFICIENT_STOCK",
            message: `Requested quantity ${body.quantity} exceeds available stock (${variant.inventoryQuantity})`,
          },
        },
        400
      );
    }

    // 3. Fetch product to get product title & ID
    const product = await catalogRepo.getProduct(tenantId, variant.productId);
    const title = product ? `${product.name} - ${variant.title}` : variant.title;

    try {
      const updatedCart = await cartRepo.addItem(tenantId, cartId, {
        variantId: variant.id,
        productId: variant.productId,
        sku: variant.sku,
        title,
        unitPrice: variant.price,
        quantity: body.quantity,
        totalPrice: createMoney(variant.price.amount * body.quantity, variant.price.currency),
      });

      return c.json(updatedCart);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: { code: "CART_ERROR", message } }, 400);
    }
  });

  // Remove item from cart
  router.delete("/:id/items/:variantId", async (c) => {
    const tenantId = c.get("tenantId");
    const cartId = c.req.param("id");
    const variantId = c.req.param("variantId");

    try {
      const updated = await cartRepo.removeItem(tenantId, cartId, variantId);
      return c.json(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: { code: "CART_ERROR", message } }, 404);
    }
  });

  return router;
}
