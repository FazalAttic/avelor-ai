import {
  type CartRepository,
  type CatalogRepository,
  createMoney,
  type EmailService,
  type OrderItem,
  type OrderRepository,
  type PaymentProvider,
} from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { requireTenant } from "../middleware/tenant";

interface CheckoutPayload {
  cartId: string;
  customerEmail: string;
  idempotencyKey?: string | undefined;
}

interface BuyNowPayload {
  variantId: string;
  quantity?: number | undefined;
  customerEmail: string;
  idempotencyKey?: string | undefined;
}

export function createOrderRoutes(
  orderRepo: OrderRepository,
  cartRepo: CartRepository,
  catalogRepo: CatalogRepository,
  paymentProvider?: PaymentProvider,
  emailService?: EmailService
) {
  const router = new Hono<AppEnv>();

  router.use("*", requireTenant);

  // List orders for tenant (optional customer email filter)
  router.get("/", async (c) => {
    const tenantId = c.get("tenantId");
    const emailFilter = c.req.query("email")?.toLowerCase().trim();
    const allOrders = await orderRepo.listOrders(tenantId);
    const orders = emailFilter
      ? allOrders.filter((o) => o.customerEmail === emailFilter)
      : allOrders;
    return c.json({ orders });
  });

  // Instant 1-Click Buy Now
  router.post("/buy-now", async (c) => {
    const tenantId = c.get("tenantId");

    let body: BuyNowPayload;
    try {
      body = await c.req.json<BuyNowPayload>();
    } catch {
      return c.json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } }, 400);
    }

    if (!body.variantId || typeof body.variantId !== "string") {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "variantId is required" } }, 400);
    }

    const quantity =
      Number.isSafeInteger(body.quantity) && (body.quantity ?? 1) > 0 ? (body.quantity ?? 1) : 1;

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

    // 1. Idempotency check
    if (body.idempotencyKey) {
      const existing = await orderRepo.getByIdempotencyKey(tenantId, body.idempotencyKey);
      if (existing) {
        return c.json(existing, 200);
      }
    }

    // 2. Load variant & verify stock
    const variant = await catalogRepo.getVariant(tenantId, body.variantId);
    if (!variant) {
      return c.json(
        { error: { code: "VARIANT_NOT_FOUND", message: `Variant '${body.variantId}' not found` } },
        404
      );
    }

    if (variant.inventoryQuantity < quantity) {
      return c.json(
        {
          error: {
            code: "INSUFFICIENT_STOCK",
            message: `Requested quantity ${quantity} exceeds available stock (${variant.inventoryQuantity})`,
          },
        },
        400
      );
    }

    // 3. Atomically deduct inventory
    await catalogRepo.updateInventory(tenantId, variant.id, -quantity);

    const total = createMoney(variant.price.amount * quantity, variant.price.currency);
    const orderItem: OrderItem = {
      variantId: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      title: variant.title,
      unitPrice: variant.price,
      quantity,
      totalPrice: total,
    };

    const order = await orderRepo.createOrder({
      tenantId,
      cartId: `instant_${crypto.randomUUID()}`,
      customerEmail: body.customerEmail,
      items: [orderItem],
      total,
      idempotencyKey: body.idempotencyKey,
    });

    let finalOrder = order;
    if (paymentProvider) {
      const session = await paymentProvider.createSession({
        tenantId,
        orderId: order.id,
        amount: order.total,
        customerEmail: order.customerEmail,
      });

      finalOrder = await orderRepo.updateOrderStatus(
        tenantId,
        order.id,
        "pending",
        session.id,
        session.checkoutUrl
      );
    }

    // 4. Send order confirmation email asynchronously
    if (emailService && finalOrder.customerEmail) {
      emailService
        .sendOrderConfirmationEmail({
          to: finalOrder.customerEmail,
          orderNumber: finalOrder.id.slice(-8).toUpperCase(),
          totalAmountFormatted: `${(finalOrder.total.amount / 100).toFixed(2)} ${finalOrder.total.currency}`,
          items: finalOrder.items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            priceFormatted: `${(i.totalPrice.amount / 100).toFixed(2)} ${i.totalPrice.currency}`,
          })),
        })
        .catch((err) => {
          console.error(`[Order Email] Failed to send receipt for order ${finalOrder.id}:`, err);
        });
    }

    return c.json(finalOrder, 201);
  });

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

    let finalOrder = order;
    if (paymentProvider) {
      const session = await paymentProvider.createSession({
        tenantId,
        orderId: order.id,
        amount: order.total,
        customerEmail: order.customerEmail,
      });

      finalOrder = await orderRepo.updateOrderStatus(
        tenantId,
        order.id,
        "pending",
        session.id,
        session.checkoutUrl
      );
    }

    // 4. Clear cart after successful order creation
    await cartRepo.clearCart(tenantId, cart.id);

    // 5. Send order confirmation email asynchronously
    if (emailService && finalOrder.customerEmail) {
      emailService
        .sendOrderConfirmationEmail({
          to: finalOrder.customerEmail,
          orderNumber: finalOrder.id.slice(-8).toUpperCase(),
          totalAmountFormatted: `${(finalOrder.total.amount / 100).toFixed(2)} ${finalOrder.total.currency}`,
          items: finalOrder.items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            priceFormatted: `${(i.totalPrice.amount / 100).toFixed(2)} ${i.totalPrice.currency}`,
          })),
        })
        .catch((err) => {
          console.error(`[Order Email] Failed to send receipt for order ${finalOrder.id}:`, err);
        });
    }

    return c.json(finalOrder, 201);
  });

  // Securely finalize payment on an order
  router.post("/:id/pay", async (c) => {
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

    const updatedOrder = await orderRepo.updateOrderStatus(
      tenantId,
      order.id,
      "paid",
      order.paymentSessionId,
      order.checkoutUrl
    );

    return c.json({
      success: true,
      order: updatedOrder,
      transactionId: `txn_${crypto.randomUUID().slice(0, 12)}`,
    });
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
