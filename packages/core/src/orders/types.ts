import type { Money } from "../money";
import type { TenantId } from "../tenant";

export type OrderStatus = "pending" | "processing" | "paid" | "failed" | "canceled" | "refunded";

export interface OrderItem {
  readonly variantId: string;
  readonly productId: string;
  readonly sku: string;
  readonly title: string;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly totalPrice: Money;
}

export interface Order {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly cartId: string;
  readonly customerEmail: string;
  readonly items: readonly OrderItem[];
  readonly total: Money;
  readonly status: OrderStatus;
  readonly idempotencyKey?: string | undefined;
  readonly paymentSessionId?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateOrderInput {
  readonly tenantId: TenantId;
  readonly cartId: string;
  readonly customerEmail: string;
  readonly items: readonly OrderItem[];
  readonly total: Money;
  readonly idempotencyKey?: string | undefined;
}

/**
 * Validates allowed state transitions for orders.
 * Enforces idempotency: transitions to the current state are safe no-ops.
 */
export function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  // Idempotent transition to same state is always allowed
  if (from === to) return true;

  switch (from) {
    case "pending":
      return to === "processing" || to === "paid" || to === "failed" || to === "canceled";
    case "processing":
      return to === "paid" || to === "failed" || to === "canceled";
    case "paid":
      return to === "refunded";
    case "failed":
    case "canceled":
    case "refunded":
      // Terminal states cannot transition further
      return false;
  }
}
