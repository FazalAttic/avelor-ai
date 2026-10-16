import { beforeEach, describe, expect, it } from "bun:test";
import {
  InMemoryCartRepository,
  InMemoryOrderRepository,
  InvalidStateTransitionError,
  createMoney,
  parseTenantId,
} from "../src/index";

describe("Cart Domain & Minor-Unit Calculation", () => {
  let cartRepo: InMemoryCartRepository;
  const tenantA = parseTenantId("store_alpha");
  const tenantB = parseTenantId("store_beta");

  beforeEach(() => {
    cartRepo = new InMemoryCartRepository();
  });

  it("creates a cart with zero subtotal and adds items accurately", async () => {
    const cart = await cartRepo.createCart(tenantA, "USD");
    expect(cart.id).toBeDefined();
    expect(cart.subtotal.amount).toBe(0);

    // Add 2 units of variant at $15.00 each
    const updated = await cartRepo.addItem(tenantA, cart.id, {
      variantId: "var_1",
      productId: "prod_1",
      sku: "SKU-1",
      title: "Ceramic Mug",
      unitPrice: createMoney(1500, "USD"), // $15.00
      quantity: 2,
      totalPrice: createMoney(3000, "USD"),
    });

    expect(updated.items.length).toBe(1);
    expect(updated.subtotal.amount).toBe(3000); // $30.00 in minor units

    // Add another unit of the same variant -> quantity should aggregate to 3
    const withMore = await cartRepo.addItem(tenantA, cart.id, {
      variantId: "var_1",
      productId: "prod_1",
      sku: "SKU-1",
      title: "Ceramic Mug",
      unitPrice: createMoney(1500, "USD"),
      quantity: 1,
      totalPrice: createMoney(1500, "USD"),
    });

    expect(withMore.items.length).toBe(1);
    expect(withMore.items[0]?.quantity).toBe(3);
    expect(withMore.subtotal.amount).toBe(4500); // $45.00
  });

  it("enforces tenant boundaries on carts", async () => {
    const cartA = await cartRepo.createCart(tenantA, "USD");

    // Tenant B cannot fetch Tenant A's cart
    const fetchedByB = await cartRepo.getCart(tenantB, cartA.id);
    expect(fetchedByB).toBeNull();

    // Tenant B cannot add items to Tenant A's cart
    await expect(
      cartRepo.addItem(tenantB, cartA.id, {
        variantId: "var_x",
        productId: "prod_x",
        sku: "SKU-X",
        title: "Malicious Item",
        unitPrice: createMoney(100, "USD"),
        quantity: 1,
        totalPrice: createMoney(100, "USD"),
      })
    ).rejects.toThrow();
  });
});

describe("Order Lifecycle & State Invariants", () => {
  let orderRepo: InMemoryOrderRepository;
  const tenantA = parseTenantId("store_alpha");

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
  });

  it("creates order and guarantees idempotency with idempotencyKey", async () => {
    const orderInput = {
      tenantId: tenantA,
      cartId: "cart_123",
      customerEmail: "buyer@example.com",
      items: [
        {
          variantId: "var_1",
          productId: "prod_1",
          sku: "SKU-1",
          title: "Ceramic Mug",
          unitPrice: createMoney(1500, "USD"),
          quantity: 2,
          totalPrice: createMoney(3000, "USD"),
        },
      ],
      total: createMoney(3000, "USD"),
      idempotencyKey: "idemp_checkout_999",
    };

    const first = await orderRepo.createOrder(orderInput);
    expect(first.status).toBe("pending");
    expect(first.total.amount).toBe(3000);

    // Re-submitting the exact same checkout with identical idempotencyKey
    const second = await orderRepo.createOrder(orderInput);
    expect(second.id).toBe(first.id); // Same order returned, no duplicate created
  });

  it("handles state transitions strictly and allows idempotent no-ops", async () => {
    const order = await orderRepo.createOrder({
      tenantId: tenantA,
      cartId: "cart_abc",
      customerEmail: "buyer@example.com",
      items: [],
      total: createMoney(5000, "USD"),
    });

    // pending -> paid
    const paidOrder = await orderRepo.updateOrderStatus(
      tenantA,
      order.id,
      "paid",
      "sess_stripe_123"
    );
    expect(paidOrder.status).toBe("paid");
    expect(paidOrder.paymentSessionId).toBe("sess_stripe_123");

    // Idempotent duplicate event: paid -> paid
    const duplicatePaid = await orderRepo.updateOrderStatus(tenantA, order.id, "paid");
    expect(duplicatePaid.status).toBe("paid");

    // paid -> refunded
    const refunded = await orderRepo.updateOrderStatus(tenantA, order.id, "refunded");
    expect(refunded.status).toBe("refunded");

    // Invalid transition: refunded -> paid
    await expect(orderRepo.updateOrderStatus(tenantA, order.id, "paid")).rejects.toThrow(
      InvalidStateTransitionError
    );
  });
});
