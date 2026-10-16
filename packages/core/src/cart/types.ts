import type { Money } from "../money";
import type { TenantId } from "../tenant";

export interface CartItem {
  readonly variantId: string;
  readonly productId: string;
  readonly sku: string;
  readonly title: string;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly totalPrice: Money;
}

export interface Cart {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly currency: string;
  readonly items: readonly CartItem[];
  readonly subtotal: Money;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AddCartItemInput {
  readonly variantId: string;
  readonly quantity: number;
}
