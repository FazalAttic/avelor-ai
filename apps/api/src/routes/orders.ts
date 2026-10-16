import type { CartRepository, CatalogRepository, OrderItem, OrderRepository } from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { requireTenant } from "../middleware/tenant";

interface CheckoutPayload {
  cartId: string;
  customerEmail: string;
  idempotencyKey?: string | undefined;
}

export function createOrderRoutes(
  orderRepo: OrderRepository,
  cartRepo: CartRepository,
  catalogRepo: CatalogRepository
) {
  const router = new Hono<AppEnv>();

  router.use("*", requireTenant);

  // Create order from cart (Checkout)
  router.post("/checkout", async (c) => {
    const tenantId = c.get("tenantId");

    let body: CheckoutPayload;
    try {
      body = await c.req.json<CheckoutPayload>();
    } catch {
      return c.json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } }, 400);
    }

    if (!body.cartId || typeof body.cartId !== "string") {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "cartId is required" } }, 400);
    }

    if (
      !body.customerEmail ||
      typeof body.customerEmail !== "string" ||
      !body.customerEmail.includes("@")
    ) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "A valid customerEmail is required" } },
        400
      );
    }

    // 1. Idempotency check: if order was already created with this idempotency key, return it immediately
    if (body.idempotencyKey) {
      const existing = await orderRepo.getByIdempotencyKey(tenantId, body.idempotencyKey);
      if (existing) {
        return c.json(existing, 200);
      }
    }

    // 2. Fetch cart
    const cart = await cartRepo.getCart(tenantId, body.cartId);
    if (!cart) {
      return c.json(
        { error: { code: "CART_NOT_FOUND", message: `Cart '${body.cartId}' not found` } },
        404
      );
    }

    if (cart.items.length === 0) {
      return c.json(
        { error: { code: "EMPTY_CART", message: "Cannot checkout an empty cart" } },
        400
      );
    }

    // 2. Server-side inventory verification and atomic deduction
    const deductedItems: Array<{ variantId: string; quantity: number }> = [];

    try {
      for (const item of cart.items) {
        // Deduct inventory
        await catalogRepo.updateInventory(tenantId, item.variantId, -item.quantity);
        deductedItems.push({ variantId: item.variantId, quantity: item.quantity });
      }
    } catch (err) {
      // Rollback any successfully deducted items if a subsequent item fails
      for (const rollback of deductedItems) {
        await catalogRepo.updateInventory(tenantId, rollback.variantId, rollback.quantity);
      }

      const message = err instanceof Error ? err.message : String(err);
      return c.json(
        {
          error: {
            code: "INSUFFICIENT_STOCK",
            message: `Checkout failed due to stock availability: ${message}`,
          },
        },
        400
      );
    }

    // 3. Create Order
    const orderItems: OrderItem[] = cart.items.map((i) => ({
      variantId: i.variantId,
      productId: i.productId,
      sku: i.sku,
      title: i.title,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      totalPrice: i.totalPrice,
    }));

    const order = await orderRepo.createOrder({
      tenantId,
      cartId: cart.id,
      customerEmail: body.customerEmail,
      items: orderItems,
      total: cart.subtotal,
      idempotencyKey: body.idempotencyKey,
    });

    // 4. Clear cart after successful order creation
    await cartRepo.clearCart(tenantId, cart.id);

    return c.json(order, 201);
  });

  // Get order by ID
  router.get("/:id", async (c) => {
    const tenantId = c.get("tenantId");
    const orderId = c.req.param("id");

    const order = await orderRepo.getOrder(tenantId, orderId);
    if (!order) {
      return c.json(
        {
          error: {
            code: "ORDER_NOT_FOUND",
            message: `Order '${orderId}' not found for this tenant`,
          },
        },
        404
      );
    }

    return c.json(order);
  });

  return router;
}
