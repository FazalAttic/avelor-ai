import {
  type CreateOrderInput,
  createMoney,
  InvalidStateTransitionError,
  isValidOrderStatusTransition,
  type Order,
  type OrderItem,
  type OrderRepository,
  type OrderStatus,
  parseTenantId,
  type TenantId,
} from "@avelor/core";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "../index";
import { orderItems, orders } from "../schema/orders";

function mapOrderItemRow(row: typeof orderItems.$inferSelect): OrderItem {
  return {
    variantId: row.variantId,
    productId: row.productId,
    sku: row.sku,
    title: row.title,
    unitPrice: createMoney(row.unitPriceAmount, row.unitPriceCurrency),
    quantity: row.quantity,
    totalPrice: createMoney(row.totalPriceAmount, row.totalPriceCurrency),
  };
}

function mapOrderRow(row: typeof orders.$inferSelect, items: readonly OrderItem[]): Order {
  return {
    id: row.id,
    tenantId: parseTenantId(row.tenantId),
    cartId: row.cartId,
    customerEmail: row.customerEmail,
    items: Object.freeze([...items]),
    total: createMoney(row.totalAmount, row.totalCurrency),
    status: row.status as OrderStatus,
    shippingAddress: row.shippingAddress ?? undefined,
    paymentMethod: row.paymentMethod ?? undefined,
    idempotencyKey: row.idempotencyKey ?? undefined,
    paymentSessionId: row.paymentSessionId ?? undefined,
    checkoutUrl: row.checkoutUrl ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * PostgreSQL Order Repository implemented with Drizzle ORM.
 * Fully supports multi-tenant isolation, line items, status state-machine transitions, and idempotency.
 */
export class DrizzleOrderRepository implements OrderRepository {
  constructor(private readonly db: Database) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    if (input.idempotencyKey) {
      const existing = await this.getByIdempotencyKey(input.tenantId, input.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const id = `ord_${crypto.randomUUID()}`;
    const now = new Date();
    const createdAt = input.createdAt ?? now;

    const [orderRow] = await this.db
      .insert(orders)
      .values({
        id,
        tenantId: input.tenantId,
        cartId: input.cartId,
        customerEmail: input.customerEmail.toLowerCase().trim(),
        totalAmount: input.total.amount,
        totalCurrency: input.total.currency,
        status: "pending",
        shippingAddress: input.shippingAddress ?? null,
        paymentMethod: input.paymentMethod ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt,
        updatedAt: now,
      })
      .returning();

    if (!orderRow) {
      throw new Error("Failed to insert order");
    }

    if (input.items.length > 0) {
      await this.db.insert(orderItems).values(
        input.items.map((item) => ({
          id: `item_${crypto.randomUUID()}`,
          orderId: id,
          tenantId: input.tenantId,
          variantId: item.variantId,
          productId: item.productId,
          sku: item.sku,
          title: item.title,
          unitPriceAmount: item.unitPrice.amount,
          unitPriceCurrency: item.unitPrice.currency,
          quantity: item.quantity,
          totalPriceAmount: item.totalPrice.amount,
          totalPriceCurrency: item.totalPrice.currency,
        }))
      );
    }

    return mapOrderRow(orderRow, input.items);
  }

  async getOrder(tenantId: TenantId, orderId: string): Promise<Order | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
      .limit(1);

    if (!row) {
      return null;
    }

    const itemRows = await this.db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.tenantId, tenantId), eq(orderItems.orderId, orderId)));

    return mapOrderRow(row, itemRows.map(mapOrderItemRow));
  }

  async getOrderByCart(tenantId: TenantId, cartId: string): Promise<Order | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.cartId, cartId)))
      .limit(1);

    if (!row) {
      return null;
    }

    const itemRows = await this.db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.tenantId, tenantId), eq(orderItems.orderId, row.id)));

    return mapOrderRow(row, itemRows.map(mapOrderItemRow));
  }

  async getByIdempotencyKey(tenantId: TenantId, idempotencyKey: string): Promise<Order | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.idempotencyKey, idempotencyKey)))
      .limit(1);

    if (!row) {
      return null;
    }

    const itemRows = await this.db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.tenantId, tenantId), eq(orderItems.orderId, row.id)));

    return mapOrderRow(row, itemRows.map(mapOrderItemRow));
  }

  async listOrders(tenantId: TenantId): Promise<readonly Order[]> {
    const orderRows = await this.db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(desc(orders.createdAt));

    if (orderRows.length === 0) {
      return [];
    }

    const orderIds = orderRows.map((o) => o.id);
    const itemRows = await this.db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.tenantId, tenantId), inArray(orderItems.orderId, orderIds)));

    const itemsByOrderId = new Map<string, OrderItem[]>();
    for (const itemRow of itemRows) {
      const items = itemsByOrderId.get(itemRow.orderId) ?? [];
      items.push(mapOrderItemRow(itemRow));
      itemsByOrderId.set(itemRow.orderId, items);
    }

    return Object.freeze(orderRows.map((o) => mapOrderRow(o, itemsByOrderId.get(o.id) ?? [])));
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

    const hasSessionUpdate =
      (paymentSessionId !== undefined && paymentSessionId !== order.paymentSessionId) ||
      (checkoutUrl !== undefined && checkoutUrl !== order.checkoutUrl);

    if (order.status === nextStatus && !hasSessionUpdate) {
      return order;
    }

    const [updatedRow] = await this.db
      .update(orders)
      .set({
        status: nextStatus,
        paymentSessionId: paymentSessionId ?? order.paymentSessionId ?? null,
        checkoutUrl: checkoutUrl ?? order.checkoutUrl ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
      .returning();

    if (!updatedRow) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return mapOrderRow(updatedRow, order.items);
  }
}
