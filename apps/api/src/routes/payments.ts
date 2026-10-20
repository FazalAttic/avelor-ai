import {
  type CatalogRepository,
  InvalidWebhookSignatureError,
  type OrderRepository,
  type PaymentProvider,
} from "@avelor/core";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { requireTenant } from "../middleware/tenant";

export interface PaymentRoutesDependencies {
  paymentProvider: PaymentProvider;
  orderRepo: OrderRepository;
  catalogRepo: CatalogRepository;
  webhookSecret?: string | undefined;
}

export function createPaymentRoutes(deps: PaymentRoutesDependencies) {
  const router = new Hono<AppEnv>();
  const defaultSecret =
    deps.webhookSecret ??
    process.env.PAYMENT_WEBHOOK_SECRET ??
    process.env.WEBHOOK_SECRET ??
    "whsec_test_secret_32chars_minimum";

  // Webhook endpoint
  // Note: tenant is verified from x-tenant-id header to guarantee multi-tenant scoping
  router.post("/webhook", requireTenant, async (c) => {
    const tenantId = c.get("tenantId");
    const signature = c.req.header("x-webhook-signature");

    if (!signature) {
      return c.json(
        {
          error: {
            code: "MISSING_WEBHOOK_SIGNATURE",
            message: "Missing 'x-webhook-signature' header",
          },
        },
        401
      );
    }

    const rawBody = await c.req.text();

    let event: Awaited<ReturnType<PaymentProvider["verifyWebhook"]>>;
    try {
      event = await deps.paymentProvider.verifyWebhook(rawBody, signature, defaultSecret);
    } catch (err) {
      if (err instanceof InvalidWebhookSignatureError) {
        return c.json(
          {
            error: {
              code: "INVALID_WEBHOOK_SIGNATURE",
              message: err.message,
            },
          },
          401
        );
      }
      return c.json(
        {
          error: {
            code: "WEBHOOK_VERIFICATION_FAILED",
            message: "Failed to verify webhook payload",
          },
        },
        400
      );
    }

    // Verify tenant boundary: webhook event tenant must match active tenant header
    if (event.tenantId !== tenantId) {
      return c.json(
        {
          error: {
            code: "TENANT_MISMATCH",
            message: "Webhook event tenant does not match request tenant context",
          },
        },
        403
      );
    }

    const order = await deps.orderRepo.getOrder(tenantId, event.orderId);
    if (!order) {
      return c.json(
        {
          error: {
            code: "ORDER_NOT_FOUND",
            message: `Order '${event.orderId}' not found`,
          },
        },
        404
      );
    }

    if (event.type === "payment_intent.succeeded") {
      const updatedOrder = await deps.orderRepo.updateOrderStatus(
        tenantId,
        order.id,
        "paid",
        event.paymentSessionId
      );

      return c.json({
        received: true,
        event: event.type,
        orderId: updatedOrder.id,
        status: updatedOrder.status,
      });
    }

    if (
      event.type === "payment_intent.payment_failed" ||
      event.type === "payment_intent.canceled"
    ) {
      const isAlreadyCanceled = order.status === "canceled" || order.status === "failed";

      if (!isAlreadyCanceled) {
        // Rollback reserved inventory back to catalog
        for (const item of order.items) {
          await deps.catalogRepo.updateInventory(tenantId, item.variantId, item.quantity);
        }

        const updatedOrder = await deps.orderRepo.updateOrderStatus(
          tenantId,
          order.id,
          "canceled",
          event.paymentSessionId
        );

        return c.json({
          received: true,
          event: event.type,
          orderId: updatedOrder.id,
          status: updatedOrder.status,
          inventoryRestored: true,
        });
      }

      return c.json({
        received: true,
        event: event.type,
        orderId: order.id,
        status: order.status,
        duplicate: true,
      });
    }

    return c.json({ received: true, ignored: true });
  });

  return router;
}
