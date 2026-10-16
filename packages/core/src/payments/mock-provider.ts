import { createHmac, timingSafeEqual } from "node:crypto";
import { createMoney } from "../money";
import type { TenantId } from "../tenant";
import {
  type CreatePaymentSessionInput,
  InvalidWebhookSignatureError,
  type PaymentProvider,
  type PaymentSession,
  type PaymentWebhookEvent,
  type PaymentWebhookEventType,
} from "./types";

// ponytail: mock payment provider ceiling: in-memory sessions + HMAC-SHA256 signature verification.
// Perfect for local dev, offline tests, and CI without external network calls or credit cards.
// Upgrade path: Stripe / LemonSqueezy adapter implementing the exact same PaymentProvider interface.

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock-pay";
  private sessions = new Map<string, PaymentSession>();

  /**
   * Helper to sign a raw webhook payload with HMAC-SHA256.
   * Format: "sha256=" + hexDigest
   */
  static signPayload(rawBody: string, secret: string): string {
    const hmac = createHmac("sha256", secret);
    hmac.update(rawBody, "utf8");
    return `sha256=${hmac.digest("hex")}`;
  }

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSession> {
    const id = `cs_mock_${crypto.randomUUID()}`;
    const session: PaymentSession = {
      id,
      orderId: input.orderId,
      tenantId: input.tenantId,
      amount: input.amount,
      checkoutUrl: `https://checkout.mockpay.test/session/${id}`,
      status: "requires_payment",
      clientSecret: `mock_secret_${crypto.randomUUID()}`,
      createdAt: new Date(),
    };

    this.sessions.set(id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<PaymentSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async verifyWebhook(
    rawBody: string,
    signature: string,
    secret: string
  ): Promise<PaymentWebhookEvent> {
    if (!signature || !secret || !rawBody) {
      throw new InvalidWebhookSignatureError("Missing required webhook signature or payload");
    }

    const expectedSignature = MockPaymentProvider.signPayload(rawBody, secret);

    const sigBuffer = Buffer.from(signature, "utf8");
    const expBuffer = Buffer.from(expectedSignature, "utf8");

    if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
      throw new InvalidWebhookSignatureError("Webhook signature verification failed");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new InvalidWebhookSignatureError("Invalid JSON in webhook payload");
    }

    const eventId = String(parsed.id ?? `evt_${crypto.randomUUID()}`);
    const type = parsed.type as PaymentWebhookEventType;
    const orderId = String(parsed.orderId ?? "");
    const paymentSessionId = String(parsed.paymentSessionId ?? "");
    const tenantId = parsed.tenantId as TenantId;
    const amountMinor = Number(parsed.amountMinor ?? 0);
    const currency = String(parsed.currency ?? "USD");

    if (!orderId || !tenantId || !type) {
      throw new InvalidWebhookSignatureError("Webhook payload is missing required domain fields");
    }

    // Update in-memory session status if it exists
    const session = this.sessions.get(paymentSessionId);
    if (session) {
      let updatedStatus = session.status;
      if (type === "payment_intent.succeeded") updatedStatus = "succeeded";
      if (type === "payment_intent.payment_failed") updatedStatus = "failed";
      if (type === "payment_intent.canceled") updatedStatus = "canceled";

      this.sessions.set(paymentSessionId, {
        ...session,
        status: updatedStatus,
      });
    }

    return {
      id: eventId,
      type,
      tenantId,
      orderId,
      paymentSessionId,
      amount: createMoney(amountMinor, currency),
      rawPayload: parsed,
      createdAt: new Date(),
    };
  }

  /**
   * Helper utility for tests to build a properly signed webhook event payload.
   */
  createMockWebhook(
    type: PaymentWebhookEventType,
    tenantId: TenantId,
    orderId: string,
    paymentSessionId: string,
    amountMinor: number,
    currency: string,
    secret: string
  ): { rawBody: string; signature: string } {
    const rawBody = JSON.stringify({
      id: `evt_mock_${crypto.randomUUID()}`,
      type,
      tenantId,
      orderId,
      paymentSessionId,
      amountMinor,
      currency,
      timestamp: new Date().toISOString(),
    });

    const signature = MockPaymentProvider.signPayload(rawBody, secret);
    return { rawBody, signature };
  }
}
