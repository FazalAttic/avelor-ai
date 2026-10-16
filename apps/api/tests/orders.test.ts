import { beforeEach, describe, expect, it } from "bun:test";
import {
  InMemoryCartRepository,
  InMemoryCatalogRepository,
  InMemoryOrderRepository,
  createMoney,
  parseTenantId,
} from "@avelor/core";
import { createApp } from "../src/app";

describe("Order & Checkout HTTP API Endpoints", () => {
  let app: ReturnType<typeof createApp>;
  let catalogRepo: InMemoryCatalogRepository;
  let cartRepo: InMemoryCartRepository;
  let orderRepo: InMemoryOrderRepository;

  const tenantA = "store_alpha";
  const tenantB = "store_beta";
  let variantId: string;
  let cartId: string;

  beforeEach(async () => {
    catalogRepo = new InMemoryCatalogRepository();
    cartRepo = new InMemoryCartRepository();
    orderRepo = new InMemoryOrderRepository();
    app = createApp({ catalogRepo, cartRepo, orderRepo });

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
});
