import {
  type Cart,
  type CartItem,
  type CartRepository,
  createMoney,
  recalculateCart,
  type TenantId,
} from "@avelor/core";
import type Redis from "ioredis";

interface SerializedCart {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly currency: string;
  readonly items: readonly {
    readonly variantId: string;
    readonly productId: string;
    readonly sku: string;
    readonly title: string;
    readonly unitPrice: { readonly amount: number; readonly currency: string };
    readonly quantity: number;
    readonly totalPrice: { readonly amount: number; readonly currency: string };
  }[];
  readonly subtotal: { readonly amount: number; readonly currency: string };
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RedisCartRepositoryOptions {
  /**
   * Cart expiration time in seconds. Defaults to 30 days (2,592,000 seconds).
   */
  readonly ttlSeconds?: number | undefined;
  readonly keyPrefix?: string | undefined;
}

export class RedisCartRepository implements CartRepository {
  private readonly ttlSeconds: number;
  private readonly keyPrefix: string;

  constructor(
    private readonly redis: Redis,
    options: RedisCartRepositoryOptions = {}
  ) {
    this.ttlSeconds = options.ttlSeconds ?? 30 * 24 * 60 * 60; // 30 days default
    this.keyPrefix = options.keyPrefix ?? "avelor:cart:";
  }

  private getCartKey(tenantId: TenantId, cartId: string): string {
    return `${this.keyPrefix}${tenantId}:${cartId}`;
  }

  private deserializeCart(serialized: SerializedCart): Cart {
    return {
      id: serialized.id,
      tenantId: serialized.tenantId,
      currency: serialized.currency,
      items: Object.freeze(
        serialized.items.map((item) => ({
          ...item,
          unitPrice: createMoney(item.unitPrice.amount, item.unitPrice.currency),
          totalPrice: createMoney(item.totalPrice.amount, item.totalPrice.currency),
        }))
      ),
      subtotal: createMoney(serialized.subtotal.amount, serialized.subtotal.currency),
      createdAt: new Date(serialized.createdAt),
      updatedAt: new Date(serialized.updatedAt),
    };
  }

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

    await this.saveCart(cart);
    return cart;
  }

  async getCart(tenantId: TenantId, cartId: string): Promise<Cart | null> {
    const key = this.getCartKey(tenantId, cartId);
    const raw = await this.redis.get(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as SerializedCart;
      if (parsed.tenantId !== tenantId) return null;
      return this.deserializeCart(parsed);
    } catch {
      return null;
    }
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
        unitPrice: newItem.unitPrice,
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

    await this.saveCart(updated);
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

    await this.saveCart(updated);
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

    await this.saveCart(updated);
    return updated;
  }

  private async saveCart(cart: Cart): Promise<void> {
    const key = this.getCartKey(cart.tenantId, cart.id);
    const serialized: SerializedCart = {
      id: cart.id,
      tenantId: cart.tenantId,
      currency: cart.currency,
      items: cart.items.map((i) => ({
        variantId: i.variantId,
        productId: i.productId,
        sku: i.sku,
        title: i.title,
        unitPrice: { amount: i.unitPrice.amount, currency: i.unitPrice.currency },
        quantity: i.quantity,
        totalPrice: { amount: i.totalPrice.amount, currency: i.totalPrice.currency },
      })),
      subtotal: { amount: cart.subtotal.amount, currency: cart.subtotal.currency },
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };

    await this.redis.set(key, JSON.stringify(serialized), "EX", this.ttlSeconds);
  }
}
