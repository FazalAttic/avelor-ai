import type { Money } from "../money";
import type { TenantId } from "../tenant";

export type OrderStatus = "pending" | "processing" | "paid" | "failed" | "canceled" | "refunded";

export interface OrderAddressCoordinates {
  readonly lat: number;
  readonly lng: number;
  readonly accuracy?: number | undefined;
}

export interface ShippingAddress {
  readonly fullName: string;
  readonly phone: string;
  readonly country: string;
  readonly line1: string; // Flat, House no, Building, Apartment
  readonly line2: string; // Area, Street, Sector, Village
  readonly landmark?: string | undefined;
  readonly pincode: string;
  readonly city: string;
  readonly state: string;
  readonly coordinates?: OrderAddressCoordinates | undefined;
  readonly isDefault?: boolean | undefined;
}

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
  readonly shippingAddress?: ShippingAddress | undefined;
  readonly paymentMethod?: string | undefined;
  readonly idempotencyKey?: string | undefined;
  readonly paymentSessionId?: string | undefined;
  readonly checkoutUrl?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateOrderInput {
  readonly tenantId: TenantId;
  readonly cartId: string;
  readonly customerEmail: string;
  readonly items: readonly OrderItem[];
  readonly total: Money;
  readonly shippingAddress?: ShippingAddress | undefined;
  readonly paymentMethod?: string | undefined;
  readonly idempotencyKey?: string | undefined;
  /** Only for importing already-placed orders (seeds, migrations). Defaults to now. */
  readonly createdAt?: Date | undefined;
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
