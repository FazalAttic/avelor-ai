import { describe, expect, test } from "bun:test";
import { createMoney } from "../src/money";
import { MockPaymentProvider } from "../src/payments/mock-provider";
import { InvalidWebhookSignatureError } from "../src/payments/types";
import { parseTenantId } from "../src/tenant";

describe("Payment Domain & Mock Provider", () => {
  const provider = new MockPaymentProvider();
  const tenantId = parseTenantId("store_us_main");
  const secret = "whsec_test_secret_1234567890abcdef";

  test("creates a payment session with integer minor units", async () => {
    const session = await provider.createSession({
      tenantId,
      orderId: "ord_123",
      amount: createMoney(4999, "USD"),
      customerEmail: "customer@example.com",
    });

    expect(session.id.startsWith("cs_mock_")).toBe(true);
    expect(session.orderId).toBe("ord_123");
    expect(session.amount.amount).toBe(4999);
    expect(session.amount.currency).toBe("USD");
    expect(session.status).toBe("requires_payment");
    expect(session.checkoutUrl).toContain(session.id);

    const retrieved = await provider.getSession(session.id);
    expect(retrieved?.id).toBe(session.id);
  });

  test("verifies a properly signed webhook event", async () => {
    const session = await provider.createSession({
      tenantId,
      orderId: "ord_success_test",
      amount: createMoney(12000, "USD"),
      customerEmail: "payer@example.com",
    });

    const { rawBody, signature } = provider.createMockWebhook(
      "payment_intent.succeeded",
      tenantId,
      "ord_success_test",
      session.id,
      12000,
      "USD",
      secret
    );

    const event = await provider.verifyWebhook(rawBody, signature, secret);

    expect(event.type).toBe("payment_intent.succeeded");
    expect(event.orderId).toBe("ord_success_test");
    expect(event.amount.amount).toBe(12000);
    expect(event.amount.currency).toBe("USD");

    // Session status should be updated
    const updatedSession = await provider.getSession(session.id);
    expect(updatedSession?.status).toBe("succeeded");
  });

  test("rejects tampered webhook payloads", async () => {
    const { rawBody, signature } = provider.createMockWebhook(
      "payment_intent.succeeded",
      tenantId,
      "ord_tamper",
      "cs_123",
      5000,
      "USD",
      secret
    );

    // Tamper with the raw body
    const tamperedBody = rawBody.replace("5000", "9999");

    expect(provider.verifyWebhook(tamperedBody, signature, secret)).rejects.toThrow(
      InvalidWebhookSignatureError
    );
  });

  test("rejects signatures created with the wrong secret", async () => {
    const { rawBody, signature } = provider.createMockWebhook(
      "payment_intent.succeeded",
      tenantId,
      "ord_wrong_secret",
      "cs_123",
      5000,
      "USD",
      "wrong_secret"
    );

    expect(provider.verifyWebhook(rawBody, signature, secret)).rejects.toThrow(
      InvalidWebhookSignatureError
    );
  });

  test("rejects missing signature or empty payload safely", async () => {
    expect(provider.verifyWebhook("", "sig", secret)).rejects.toThrow(InvalidWebhookSignatureError);
    expect(provider.verifyWebhook("{}", "", secret)).rejects.toThrow(InvalidWebhookSignatureError);
  });
});
