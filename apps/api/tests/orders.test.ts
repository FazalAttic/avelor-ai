import { beforeEach, describe, expect, it } from "bun:test";
import { createMoney, InMemoryCartRepository, parseTenantId } from "@avelor/core";
import {
  createDatabaseClient,
  DrizzleCatalogRepository,
  DrizzleOrderRepository,
} from "@avelor/database";
import { createApp } from "../src/app";

describe("Order & Checkout HTTP API Endpoints", () => {
  let app: ReturnType<typeof createApp>;
  let catalogRepo: DrizzleCatalogRepository;
  let cartRepo: InMemoryCartRepository;
  let orderRepo: DrizzleOrderRepository;

  let tenantA: string;
  let tenantB: string;
  let variantId: string;
  let cartId: string;

  beforeEach(async () => {
    const db = createDatabaseClient(
      process.env.DATABASE_URL ?? "postgres://avelor:avelor@localhost:5433/avelor_dev"
    );
    catalogRepo = new DrizzleCatalogRepository(db);
    cartRepo = new InMemoryCartRepository();
    orderRepo = new DrizzleOrderRepository(db);

    const rand = Math.random().toString(36).substring(2, 9);
    tenantA = `test_ord_a_${rand}`;
    tenantB = `test_ord_b_${rand}`;

    app = createApp({ database: db, catalogRepo, cartRepo, orderRepo });

    // Seed product with 5 in stock
    const product = await catalogRepo.createProduct({
      tenantId: parseTenantId(tenantA),
      name: "Specialty Espresso Beans",
      status: "active",
    });

    const variant = await catalogRepo.createVariant({
      productId: product.id,
      tenantId: parseTenantId(tenantA),
      sku: "BEANS-ESP-1KG",
      title: "1kg Bag",
      price: createMoney(3500, "USD"), // $35.00
      inventoryQuantity: 5,
    });

    variantId = variant.id;

    // Create cart and add 2 units
    const cart = await cartRepo.createCart(parseTenantId(tenantA), "USD");
    await cartRepo.addItem(parseTenantId(tenantA), cart.id, {
      variantId,
      productId: product.id,
      sku: variant.sku,
      title: "Specialty Espresso Beans - 1kg Bag",
      unitPrice: variant.price,
      quantity: 2,
      totalPrice: createMoney(7000, "USD"),
    });

    cartId = cart.id;
  });

  it("checks out cart, creates order, and deducts inventory atomically", async () => {
    const res = await app.request("/api/v1/orders/checkout", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cartId,
        customerEmail: "alice@example.com",
        idempotencyKey: "idemp_checkout_1",
      }),
    });

    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order.id).toBeDefined();
    expect(order.status).toBe("pending");
    expect(order.total.amount).toBe(7000); // 2 x $35.00 = $70.00
    expect(order.items.length).toBe(1);

    // Verify inventory was deducted from 5 to 3
    const variantAfter = await catalogRepo.getVariant(parseTenantId(tenantA), variantId);
    expect(variantAfter?.inventoryQuantity).toBe(3);

    // Verify cart was cleared after checkout
    const cartAfter = await cartRepo.getCart(parseTenantId(tenantA), cartId);
    expect(cartAfter?.items.length).toBe(0);
  });

  it("returns existing order when called with the same idempotencyKey", async () => {
    const payload = {
      cartId,
      customerEmail: "alice@example.com",
      idempotencyKey: "idemp_repeat_key_100",
    };

    const res1 = await app.request("/api/v1/orders/checkout", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const order1 = await res1.json();

    // Second call with same idempotency key (simulating duplicate webhook or retry)
    const res2 = await app.request("/api/v1/orders/checkout", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const order2 = await res2.json();

    expect(order2.id).toBe(order1.id);
  });

  it("enforces tenant isolation on orders", async () => {
    const res = await app.request("/api/v1/orders/checkout", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cartId,
        customerEmail: "alice@example.com",
      }),
    });
    const order = await res.json();

    // Tenant B cannot retrieve Tenant A's order
    const getResB = await app.request(`/api/v1/orders/${order.id}`, {
      headers: { "x-tenant-id": tenantB },
    });
    expect(getResB.status).toBe(404);
  });

  it("executes 1-click buy-now, deducts stock, and confirms payment securely", async () => {
    // 1. Instant Buy Now
    const buyRes = await app.request("/api/v1/orders/buy-now", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        variantId,
        quantity: 1,
        customerEmail: "charlie@example.com",
        idempotencyKey: "idemp_buynow_1",
      }),
    });

    expect(buyRes.status).toBe(201);
    const order = await buyRes.json();
    expect(order.id).toBeDefined();
    expect(order.status).toBe("pending");
    expect(order.total.amount).toBe(3500);
    expect(order.items[0].variantId).toBe(variantId);

    // 2. Complete secure payment
    const payRes = await app.request(`/api/v1/orders/${order.id}/pay`, {
      method: "POST",
      headers: {
        "x-tenant-id": tenantA,
        "content-type": "application/json",
      },
    });

    expect(payRes.status).toBe(200);
    const payResult = await payRes.json();
    expect(payResult.success).toBe(true);
    expect(payResult.order.status).toBe("paid");
    expect(payResult.transactionId).toMatch(/^txn_/);

    // 3. List orders filtered by email
    const listRes = await app.request("/api/v1/orders?email=charlie@example.com", {
      headers: { "x-tenant-id": tenantA },
    });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.orders.length).toBe(1);
    expect(listData.orders[0].id).toBe(order.id);
    expect(listData.orders[0].status).toBe("paid");
  });
});
