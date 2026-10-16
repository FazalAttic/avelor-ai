import type { Money } from "../money";
import type { TenantId } from "../tenant";

export type PaymentSessionStatus = "requires_payment" | "succeeded" | "failed" | "canceled";

export interface CreatePaymentSessionInput {
  readonly tenantId: TenantId;
  readonly orderId: string;
  readonly amount: Money;
  readonly customerEmail: string;
  readonly returnUrl?: string | undefined;
}

export interface PaymentSession {
  readonly id: string;
  readonly orderId: string;
  readonly tenantId: TenantId;
  readonly amount: Money;
  readonly checkoutUrl: string;
  readonly status: PaymentSessionStatus;
  readonly clientSecret?: string | undefined;
  readonly createdAt: Date;
}

export type PaymentWebhookEventType =
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "payment_intent.canceled";

export interface PaymentWebhookEvent {
  readonly id: string;
  readonly type: PaymentWebhookEventType;
  readonly tenantId: TenantId;
  readonly orderId: string;
  readonly paymentSessionId: string;
  readonly amount: Money;
  readonly rawPayload: Record<string, unknown>;
  readonly createdAt: Date;
}

export class InvalidWebhookSignatureError extends Error {
  constructor(message = "Invalid or missing webhook signature") {
    super(message);
    this.name = "InvalidWebhookSignatureError";
  }
}

/**
 * Universal payment provider contract.
 * Decouples commerce transaction logic from specific payment processors (Stripe, LemonSqueezy, Mock, etc.).
 */
export interface PaymentProvider {
  readonly name: string;
  createSession(input: CreatePaymentSessionInput): Promise<PaymentSession>;
  getSession(sessionId: string): Promise<PaymentSession | null>;
  verifyWebhook(rawBody: string, signature: string, secret: string): Promise<PaymentWebhookEvent>;
}
