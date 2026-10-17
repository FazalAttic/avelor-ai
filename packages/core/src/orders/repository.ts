import type { TenantId } from "../tenant";
import {
  type CreateOrderInput,
  isValidOrderStatusTransition,
  type Order,
  type OrderStatus,
} from "./types";

export class InvalidStateTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid order transition from '${from}' to '${to}'`);
    this.name = "InvalidStateTransitionError";
  }
}

export interface OrderRepository {
  createOrder(input: CreateOrderInput): Promise<Order>;
  getOrder(tenantId: TenantId, orderId: string): Promise<Order | null>;
  getOrderByCart(tenantId: TenantId, cartId: string): Promise<Order | null>;
  getByIdempotencyKey(tenantId: TenantId, idempotencyKey: string): Promise<Order | null>;
  listOrders(tenantId: TenantId): Promise<readonly Order[]>;
  updateOrderStatus(
    tenantId: TenantId,
    orderId: string,
    status: OrderStatus,
    paymentSessionId?: string | undefined,
    checkoutUrl?: string | undefined
  ): Promise<Order>;
}

// In-memory order store: acceptable for local development and unit tests.
// Upgrade path: PostgreSQL OrderRepository with ACID transactions and row-level locks.

export class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();
  private idempotencyIndex = new Map<string, string>(); // `${tenantId}:${idempotencyKey}` -> orderId

  async createOrder(input: CreateOrderInput): Promise<Order> {
    // 1. Idempotency check
    if (input.idempotencyKey) {
      const indexKey = `${input.tenantId}:${input.idempotencyKey}`;
      const existingId = this.idempotencyIndex.get(indexKey);
      if (existingId) {
        const existingOrder = this.orders.get(existingId);
        if (existingOrder && existingOrder.tenantId === input.tenantId) {
          return existingOrder;
        }
      }
    }

    const id = `ord_${crypto.randomUUID()}`;
    const now = new Date();

    const order: Order = {
      id,
      tenantId: input.tenantId,
      cartId: input.cartId,
      customerEmail: input.customerEmail.toLowerCase().trim(),
      items: Object.freeze([...input.items]),
      total: input.total,
      status: "pending",
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(id, order);

    if (input.idempotencyKey) {
      this.idempotencyIndex.set(`${input.tenantId}:${input.idempotencyKey}`, id);
    }

    return order;
  }

  async getOrder(tenantId: TenantId, orderId: string): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order || order.tenantId !== tenantId) {
      return null;
    }
    return order;
  }

  async getOrderByCart(tenantId: TenantId, cartId: string): Promise<Order | null> {
    for (const order of this.orders.values()) {
      if (order.tenantId === tenantId && order.cartId === cartId) {
        return order;
      }
    }
    return null;
  }

  async getByIdempotencyKey(tenantId: TenantId, idempotencyKey: string): Promise<Order | null> {
    const orderId = this.idempotencyIndex.get(`${tenantId}:${idempotencyKey}`);
    if (!orderId) return null;
    return this.getOrder(tenantId, orderId);
  }

  async listOrders(tenantId: TenantId): Promise<readonly Order[]> {
    return Array.from(this.orders.values())
      .filter((o) => o.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateOrderStatus(
    tenantId: TenantId,
    orderId: string,
    nextStatus: OrderStatus,
    paymentSessionId?: string | undefined,
    checkoutUrl?: string | undefined
  ): Promise<Order> {
    const order = await this.getOrder(tenantId, orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (!isValidOrderStatusTransition(order.status, nextStatus)) {
      throw new InvalidStateTransitionError(order.status, nextStatus);
    }

    // Idempotent no-op if status is unchanged and no new session details provided
    const hasSessionUpdate =
      (paymentSessionId !== undefined && paymentSessionId !== order.paymentSessionId) ||
      (checkoutUrl !== undefined && checkoutUrl !== order.checkoutUrl);

    if (order.status === nextStatus && !hasSessionUpdate) {
      return order;
    }

    const updated: Order = {
      ...order,
      status: nextStatus,
      paymentSessionId: paymentSessionId ?? order.paymentSessionId,
      checkoutUrl: checkoutUrl ?? order.checkoutUrl,
      updatedAt: new Date(),
    };

    this.orders.set(orderId, updated);
    return updated;
  }
}
