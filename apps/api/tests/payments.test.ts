import { beforeEach, describe, expect, it } from "bun:test";
import {
  InMemoryCartRepository,
  InMemoryCatalogRepository,
  InMemoryOrderRepository,
  MockPaymentProvider,
  createMoney,
  parseTenantId,
} from "@avelor/core";
import { createApp } from "../src/app";

describe("Payment & Webhook HTTP API Endpoints", () => {
  let app: ReturnType<typeof createApp>;
  let catalogRepo: InMemoryCatalogRepository;
  let cartRepo: InMemoryCartRepository;
  let orderRepo: InMemoryOrderRepository;
  let paymentProvider: MockPaymentProvider;

  const tenantA = "store_payments_alpha";
  const tenantB = "store_payments_beta";
  const webhookSecret = "whsec_test_secret_32chars_minimum";
  let variantId: string;
  let orderId: string;
  let paymentSessionId: string;

  beforeEach(async () => {
    catalogRepo = new InMemoryCatalogRepository();
    cartRepo = new InMemoryCartRepository();
    orderRepo = new InMemoryOrderRepository();
    paymentProvider = new MockPaymentProvider();

    app = createApp({
      catalogRepo,
      cartRepo,
      orderRepo,
      paymentProvider,
      webhookSecret,
    });

    // Seed product with initial inventory of 10
    const product = await catalogRepo.createProduct({
      tenantId: parseTenantId(tenantA),
      name: "Mechanical Keyboard",
      status: "active",
    });

    const variant = await catalogRepo.createVariant({
      productId: product.id,
      tenantId: parseTenantId(tenantA),
      sku: "KB-MECH-RGB",
      title: "RGB Tactile",
      price: createMoney(15000, "USD"), // $150.00
      inventoryQuantity: 10,
    });
    variantId = variant.id;

    // Create cart and checkout 2 units (remaining inventory = 8)
    const cart = await cartRepo.createCart(parseTenantId(tenantA), "USD");
    await cartRepo.addItem(parseTenantId(tenantA), cart.id, {
      variantId,
      productId: product.id,
      sku: variant.sku,
      title: "Mechanical Keyboard - RGB Tactile",
      unitPrice: variant.price,
      quantity: 2,
      totalPrice: createMoney(30000, "USD"),
    });

    const checkoutRes = await app.request("/api/v1/orders/checkout", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cartId: cart.id,
        customerEmail: "buyer@example.com",
      }),
    });

    expect(checkoutRes.status).toBe(201);
    const orderData = await checkoutRes.json();
    orderId = orderData.id;
    paymentSessionId = orderData.paymentSessionId;
    expect(orderData.checkoutUrl).toBeDefined();
    expect(paymentSessionId).toBeDefined();
  });

  it("rejects webhook requests without x-tenant-id", async () => {
    const res = await app.request("/api/v1/payments/webhook", {
      method: "POST",
      headers: {
        "x-webhook-signature": "sha256=fake",
      },
      body: "{}",
    });

    expect(res.status).toBe(400);
  });

  it("rejects webhook requests without x-webhook-signature", async () => {
    const res = await app.request("/api/v1/payments/webhook", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
      },
      body: "{}",
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("MISSING_WEBHOOK_SIGNATURE");
  });

  it("rejects webhook requests with forged or tampered signatures", async () => {
    const { rawBody } = paymentProvider.createMockWebhook(
      "payment_intent.succeeded",
      parseTenantId(tenantA),
      orderId,
      paymentSessionId,
      30000,
      "USD",
      webhookSecret
    );

    const res = await app.request("/api/v1/payments/webhook", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "x-webhook-signature": "sha256=forged_bad_signature_value_1234567890",
      },
      body: rawBody,
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("INVALID_WEBHOOK_SIGNATURE");
  });

  it("rejects webhook if payload tenant does not match tenant header", async () => {
    const { rawBody, signature } = paymentProvider.createMockWebhook(
      "payment_intent.succeeded",
      parseTenantId(tenantB), // Cross-tenant payload
      orderId,
      paymentSessionId,
      30000,
      "USD",
      webhookSecret
    );

    const res = await app.request("/api/v1/payments/webhook", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "x-webhook-signature": signature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe("TENANT_MISMATCH");
  });

  it("verifies webhook and transitions order from pending to paid", async () => {
    const { rawBody, signature } = paymentProvider.createMockWebhook(
      "payment_intent.succeeded",
      parseTenantId(tenantA),
      orderId,
      paymentSessionId,
      30000,
      "USD",
      webhookSecret
    );

    const res = await app.request("/api/v1/payments/webhook", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "x-webhook-signature": signature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.status).toBe("paid");

    // Verify order in repository is paid
    const orderInRepo = await orderRepo.getOrder(parseTenantId(tenantA), orderId);
    expect(orderInRepo?.status).toBe("paid");
  });

  it("handles duplicate payment.succeeded webhooks idempotently", async () => {
    const { rawBody, signature } = paymentProvider.createMockWebhook(
      "payment_intent.succeeded",
      parseTenantId(tenantA),
      orderId,
      paymentSessionId,
      30000,
      "USD",
      webhookSecret
    );

    // Call 1
    const res1 = await app.request("/api/v1/payments/webhook", {
      method: "POST",
      headers: { "x-tenant-id": tenantA, "x-webhook-signature": signature },
      body: rawBody,
    });
    expect(res1.status).toBe(200);

    // Call 2 (duplicate delivery)
    const res2 = await app.request("/api/v1/payments/webhook", {
      method: "POST",
      headers: { "x-tenant-id": tenantA, "x-webhook-signature": signature },
      body: rawBody,
    });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.status).toBe("paid");
  });

  it("handles payment.failed webhook by canceling order and rolling back reserved inventory", async () => {
    // Inventory was reduced from 10 to 8 during checkout
    const beforeFail = await catalogRepo.getVariant(parseTenantId(tenantA), variantId);
    expect(beforeFail?.inventoryQuantity).toBe(8);

    const { rawBody, signature } = paymentProvider.createMockWebhook(
      "payment_intent.payment_failed",
      parseTenantId(tenantA),
      orderId,
      paymentSessionId,
      30000,
      "USD",
      webhookSecret
    );

    const res = await app.request("/api/v1/payments/webhook", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "x-webhook-signature": signature,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.status).toBe("canceled");
    expect(data.inventoryRestored).toBe(true);

    // Verify inventory was restored back to 10 in catalog!
    const afterRollback = await catalogRepo.getVariant(parseTenantId(tenantA), variantId);
    expect(afterRollback?.inventoryQuantity).toBe(10);

    // Verify order in repository is canceled
    const orderInRepo = await orderRepo.getOrder(parseTenantId(tenantA), orderId);
    expect(orderInRepo?.status).toBe("canceled");

    // Second duplicate failure webhook must not double-restore inventory
    const dupRes = await app.request("/api/v1/payments/webhook", {
      method: "POST",
      headers: { "x-tenant-id": tenantA, "x-webhook-signature": signature },
      body: rawBody,
    });
    expect(dupRes.status).toBe(200);
    const dupVariant = await catalogRepo.getVariant(parseTenantId(tenantA), variantId);
    expect(dupVariant?.inventoryQuantity).toBe(10); // Still 10, not 12!
  });
});
