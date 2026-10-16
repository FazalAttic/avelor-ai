import { createMoney } from "../money";
import type { TenantId } from "../tenant";
import { recalculateCart } from "./calculator";
import type { Cart, CartItem } from "./types";

export interface CartRepository {
  createCart(tenantId: TenantId, currency?: string): Promise<Cart>;
  getCart(tenantId: TenantId, cartId: string): Promise<Cart | null>;
  addItem(tenantId: TenantId, cartId: string, item: CartItem): Promise<Cart>;
  removeItem(tenantId: TenantId, cartId: string, variantId: string): Promise<Cart>;
  clearCart(tenantId: TenantId, cartId: string): Promise<Cart>;
}

// In-memory cart store with no TTL: acceptable for local development and unit tests.
// Upgrade path: Redis or PostgreSQL cart persistence with TTL expiration.

export class InMemoryCartRepository implements CartRepository {
  private carts = new Map<string, Cart>();

  async createCart(tenantId: TenantId, currency = "USD"): Promise<Cart> {
    const id = `cart_${crypto.randomUUID()}`;
    const now = new Date();

    const cart: Cart = {
      id,
      tenantId,
      currency: currency.toUpperCase(),
      items: Object.freeze([]),
      subtotal: createMoney(0, currency),
      createdAt: now,
      updatedAt: now,
    };

    this.carts.set(id, cart);
    return cart;
  }

  async getCart(tenantId: TenantId, cartId: string): Promise<Cart | null> {
    const cart = this.carts.get(cartId);
    if (!cart || cart.tenantId !== tenantId) {
      return null;
    }
    return cart;
  }

  async addItem(tenantId: TenantId, cartId: string, newItem: CartItem): Promise<Cart> {
    const cart = await this.getCart(tenantId, cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    const items = [...cart.items];
    const existingIndex = items.findIndex((i) => i.variantId === newItem.variantId);
    const existing = existingIndex >= 0 ? items[existingIndex] : undefined;
    if (existing && existingIndex >= 0) {
      const updatedQuantity = existing.quantity + newItem.quantity;
      items[existingIndex] = {
        ...existing,
        unitPrice: newItem.unitPrice, // Keep latest unit price
        quantity: updatedQuantity,
        totalPrice: createMoney(newItem.unitPrice.amount * updatedQuantity, cart.currency),
      };
    } else {
      items.push(newItem);
    }

    const updated = recalculateCart({
      ...cart,
      items: Object.freeze(items),
    });

    this.carts.set(cartId, updated);
    return updated;
  }

  async removeItem(tenantId: TenantId, cartId: string, variantId: string): Promise<Cart> {
    const cart = await this.getCart(tenantId, cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    const items = cart.items.filter((i) => i.variantId !== variantId);

    const updated = recalculateCart({
      ...cart,
      items: Object.freeze(items),
    });

    this.carts.set(cartId, updated);
    return updated;
  }

  async clearCart(tenantId: TenantId, cartId: string): Promise<Cart> {
    const cart = await this.getCart(tenantId, cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    const updated: Cart = {
      ...cart,
      items: Object.freeze([]),
      subtotal: createMoney(0, cart.currency),
      updatedAt: new Date(),
    };

    this.carts.set(cartId, updated);
    return updated;
  }
}
