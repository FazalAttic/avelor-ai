import { describe, expect, it } from "bun:test";
import {
  createMoney,
  InMemoryCartRepository,
  InMemoryCatalogRepository,
  InMemoryOrderRepository,
  ResendEmailService,
} from "@avelor/core";
import { createApp } from "../src/app";
import { createAuth } from "../src/auth";

describe("Email & Resend Integration End-to-End", () => {
  const tenantId = "store_alpha";

  it("sends password reset email via ResendEmailService upon forgot-password request", async () => {
    const emailService = new ResendEmailService({ apiKey: undefined });
    const auth = createAuth({ emailService });
    const app = createApp({ auth, emailService });

    // 1. Sign up user
    const signupRes = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "resetme@example.com",
        password: "Password123!",
        name: "Reset User",
      }),
    });
    expect(signupRes.status).toBe(200);

    emailService.clearSentEmails();

    // 2. Request password reset
    const forgetRes = await app.request("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "resetme@example.com",
        redirectTo: "http://localhost:3000/reset-password",
      }),
    });
    expect(forgetRes.status).toBe(200);

    // 3. Verify email was dispatched
    const sent = emailService.getSentEmails();
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const resetEmail = sent.find((e) => e.to.includes("resetme@example.com"));
    expect(resetEmail).toBeDefined();
    expect(resetEmail?.subject).toContain("Reset your password");
    expect(resetEmail?.html).toContain("reset-password");
  });

  it("sends verification email on registration when requireEmailVerification is enabled", async () => {
    const emailService = new ResendEmailService({ apiKey: undefined });
    const auth = createAuth({
      emailService,
      requireEmailVerification: true,
    });
    const app = createApp({ auth, emailService });

    const signupRes = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "verifyuser@example.com",
        password: "Password123!",
        name: "Verify User",
      }),
    });
    expect(signupRes.status).toBe(200);

    const sent = emailService.getSentEmails();
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const verifyEmail = sent.find((e) => e.to.includes("verifyuser@example.com"));
    expect(verifyEmail).toBeDefined();
    expect(verifyEmail?.subject).toContain("Verify your email address");
    expect(verifyEmail?.html).toContain("Verify Email Address");
  });

  it("sends order confirmation receipt upon checkout completion", async () => {
    const emailService = new ResendEmailService({ apiKey: undefined });
    const catalogRepo = new InMemoryCatalogRepository();
    const cartRepo = new InMemoryCartRepository();
    const orderRepo = new InMemoryOrderRepository();

    const app = createApp({
      catalogRepo,
      cartRepo,
      orderRepo,
      emailService,
    });

    // 1. Create product and variant
    const product = await catalogRepo.createProduct({
      tenantId: tenantId as never,
      name: "Ergonomic Desk",
      status: "active",
    });

    const variant = await catalogRepo.createVariant({
      tenantId: tenantId as never,
      productId: product.id,
      sku: "DESK-OAK",
      title: "Solid Oak Desk",
      price: createMoney(49900, "USD"), // $499.00
      inventoryQuantity: 10,
    });

    // 2. Add to cart
    const cart = await cartRepo.createCart(tenantId as never);
    await cartRepo.addItem(tenantId as never, cart.id, {
      productId: product.id,
      variantId: variant.id,
      quantity: 1,
      sku: variant.sku,
      title: variant.title,
      unitPrice: variant.price,
    });

    // 3. Checkout with customer email
    const checkoutRes = await app.request("/api/v1/orders/checkout", {
      method: "POST",
      headers: {
        "x-tenant-id": tenantId,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cartId: cart.id,
        customerEmail: "buyer@example.com",
      }),
    });

    expect(checkoutRes.status).toBe(201);

    // 4. Verify confirmation email was queued/dispatched
    const sent = emailService.getSentEmails();
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const orderEmail = sent.find((e) => e.to.includes("buyer@example.com"));
    expect(orderEmail).toBeDefined();
    expect(orderEmail?.subject).toContain("Order Confirmed");
    expect(orderEmail?.html).toContain("Solid Oak Desk");
    expect(orderEmail?.html).toContain("499.00 USD");
  });
});
