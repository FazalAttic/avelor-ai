export interface ChatMoney {
  readonly amount: number;
  readonly currency: string;
}

export interface ChatVariant {
  readonly id: string;
  readonly title: string;
  readonly price: ChatMoney;
  readonly inventoryQuantity: number;
}

export interface ChatProduct {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly categories: readonly string[];
  readonly media: readonly string[];
  readonly variants: readonly ChatVariant[];
}

export interface ChatHistoryMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface ChatApiResponse {
  readonly reply: string;
  readonly products: readonly ChatProduct[];
  readonly conversationId?: string | undefined;
  readonly title?: string | undefined;
}

export interface RecentConversationItem {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StoredUiMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly products?: readonly ChatProduct[] | undefined;
  readonly createdAt: string;
}

export interface StoredConversationDetails {
  readonly id: string;
  readonly title: string;
  readonly messages: readonly StoredUiMessage[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface ChatApiErrorBody {
  readonly error?: { readonly code?: string; readonly message?: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
const TENANT_ID = process.env.NEXT_PUBLIC_AVELOR_TENANT_ID ?? "store_alpha";

export function formatPrice(money: ChatMoney): string {
  const value = (money.amount / 100).toFixed(2);
  return money.currency === "USD" ? `$${value}` : `${value} ${money.currency}`;
}

export interface StreamChatCallbacks {
  onMeta?: (meta: { conversationId?: string; title?: string }) => void;
  onDelta?: (delta: string) => void;
  onDone?: (data: {
    reply: string;
    products: readonly ChatProduct[];
    conversationId?: string;
    title?: string;
  }) => void;
}

export async function streamChatMessage(
  message: string,
  history?: readonly ChatHistoryMessage[] | undefined,
  conversationId?: string | null | undefined,
  callbacks?: StreamChatCallbacks
): Promise<ChatApiResponse> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
    body: JSON.stringify({
      message,
      stream: true,
      ...(history && history.length > 0 ? { history } : {}),
      ...(conversationId ? { conversationId } : {}),
    }),
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as ChatApiErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {
      // Non-JSON error body — keep the status-based message
    }
    throw new Error(detail);
  }

  // If response is not SSE, fall back to JSON
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const data = (await response.json()) as ChatApiResponse;
    if (callbacks?.onDelta) callbacks.onDelta(data.reply);
    if (callbacks?.onDone) callbacks.onDone(data);
    return data;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalReply = "";
  let finalProducts: readonly ChatProduct[] = [];
  let finalConversationId = conversationId ?? undefined;
  let finalTitle: string | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr) continue;

        try {
          const payload = JSON.parse(jsonStr);
          if (payload.type === "meta") {
            if (payload.conversationId) finalConversationId = payload.conversationId;
            if (payload.title) finalTitle = payload.title;
            callbacks?.onMeta?.(payload);
          } else if (payload.type === "delta" && typeof payload.text === "string") {
            finalReply += payload.text;
            callbacks?.onDelta?.(payload.text);
          } else if (payload.type === "done") {
            if (payload.reply) finalReply = payload.reply;
            if (payload.products) finalProducts = payload.products;
            if (payload.conversationId) finalConversationId = payload.conversationId;
            if (payload.title) finalTitle = payload.title;
            callbacks?.onDone?.(payload);
          }
        } catch {
          // ignore partial JSON parse error
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    reply: finalReply,
    products: finalProducts,
    conversationId: finalConversationId,
    title: finalTitle,
  };
}

export async function sendChatMessage(
  message: string,
  history?: readonly ChatHistoryMessage[] | undefined,
  conversationId?: string | null | undefined
): Promise<ChatApiResponse> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
    body: JSON.stringify({
      message,
      ...(history && history.length > 0 ? { history } : {}),
      ...(conversationId ? { conversationId } : {}),
    }),
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as ChatApiErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {
      // Non-JSON error body — keep the status-based message
    }
    throw new Error(detail);
  }

  return (await response.json()) as ChatApiResponse;
}

export async function fetchRecentConversations(): Promise<RecentConversationItem[]> {
  const response = await fetch(`${API_URL}/chat/conversations?limit=20`, {
    headers: {
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
  });

  if (!response.ok) {
    return [];
  }

  try {
    const data = (await response.json()) as { conversations?: RecentConversationItem[] };
    return data.conversations ?? [];
  } catch {
    return [];
  }
}

export async function fetchConversation(
  conversationId: string
): Promise<StoredConversationDetails | null> {
  const response = await fetch(
    `${API_URL}/chat/conversations/${encodeURIComponent(conversationId)}`,
    {
      headers: {
        "x-tenant-id": TENANT_ID,
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    return null;
  }

  try {
    const data = (await response.json()) as { conversation?: StoredConversationDetails };
    return data.conversation ?? null;
  } catch {
    return null;
  }
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const response = await fetch(
    `${API_URL}/chat/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "DELETE",
      headers: {
        "x-tenant-id": TENANT_ID,
      },
      credentials: "include",
    }
  );

  return response.ok;
}

export interface OrderItemPayload {
  readonly variantId: string;
  readonly productId: string;
  readonly sku: string;
  readonly title: string;
  readonly unitPrice: ChatMoney;
  readonly quantity: number;
  readonly totalPrice: ChatMoney;
}

export interface ShippingAddressPayload {
  readonly fullName: string;
  readonly phone: string;
  readonly country: string;
  readonly line1: string; // flat, house, building, apartment
  readonly line2: string; // area, street, sector, village
  readonly landmark?: string | undefined;
  readonly pincode: string;
  readonly city: string;
  readonly state: string;
  readonly coordinates?:
    | {
        readonly lat: number;
        readonly lng: number;
        readonly accuracy?: number | undefined;
      }
    | undefined;
  readonly isDefault?: boolean | undefined;
}

export interface StoreOrder {
  readonly id: string;
  readonly tenantId: string;
  readonly cartId: string;
  readonly customerEmail: string;
  readonly items: readonly OrderItemPayload[];
  readonly total: ChatMoney;
  readonly status:
    | "pending"
    | "paid"
    | "processing"
    | "shipped"
    | "delivered"
    | "canceled"
    | "failed";
  readonly shippingAddress?: ShippingAddressPayload | undefined;
  readonly paymentMethod?: string | undefined;
  readonly paymentSessionId?: string | undefined;
  readonly checkoutUrl?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BuyNowRequest {
  variantId: string;
  quantity?: number;
  customerEmail: string;
  idempotencyKey?: string;
}

export async function buyNow(payload: BuyNowRequest): Promise<StoreOrder> {
  const response = await fetch(`${API_URL}/orders/buy-now`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Checkout failed (${response.status})`;
    try {
      const body = (await response.json()) as ChatApiErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {
      // Non-JSON error body
    }
    throw new Error(detail);
  }

  return (await response.json()) as StoreOrder;
}

export async function confirmPayment(
  orderId: string
): Promise<{ success: boolean; order: StoreOrder; transactionId: string }> {
  const response = await fetch(`${API_URL}/orders/${encodeURIComponent(orderId)}/pay`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
  });

  if (!response.ok) {
    let detail = `Payment processing failed (${response.status})`;
    try {
      const body = (await response.json()) as ChatApiErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {
      // Non-JSON error body
    }
    throw new Error(detail);
  }

  return (await response.json()) as { success: boolean; order: StoreOrder; transactionId: string };
}

export interface CartItemDto {
  readonly variantId: string;
  readonly productId: string;
  readonly sku: string;
  readonly title: string;
  readonly unitPrice: ChatMoney;
  readonly quantity: number;
  readonly totalPrice: ChatMoney;
}

export interface CartDto {
  readonly id: string;
  readonly tenantId: string;
  readonly currency: string;
  readonly items: readonly CartItemDto[];
  readonly subtotal: ChatMoney;
}

export async function createCart(currency = "USD"): Promise<CartDto> {
  const response = await fetch(`${API_URL}/carts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
    body: JSON.stringify({ currency }),
  });

  if (!response.ok) {
    let detail = `Failed to initialize cart (${response.status})`;
    try {
      const body = (await response.json()) as ChatApiErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as CartDto;
}

export async function fetchCart(cartId: string): Promise<CartDto | null> {
  const response = await fetch(`${API_URL}/carts/${encodeURIComponent(cartId)}`, {
    headers: {
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as CartDto;
}

export async function addItemToCart(
  cartId: string,
  variantId: string,
  quantity = 1
): Promise<CartDto> {
  const response = await fetch(`${API_URL}/carts/${encodeURIComponent(cartId)}/items`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
    body: JSON.stringify({ variantId, quantity }),
  });

  if (!response.ok) {
    let detail = `Failed to add item to cart (${response.status})`;
    try {
      const body = (await response.json()) as ChatApiErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {
      // Non-JSON error body
    }
    throw new Error(detail);
  }

  return (await response.json()) as CartDto;
}

export async function removeItemFromCart(cartId: string, variantId: string): Promise<CartDto> {
  const response = await fetch(
    `${API_URL}/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(variantId)}`,
    {
      method: "DELETE",
      headers: {
        "x-tenant-id": TENANT_ID,
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove item (${response.status})`);
  }

  return (await response.json()) as CartDto;
}

export async function checkoutCart(
  cartId: string,
  customerEmail: string,
  idempotencyKey?: string,
  shippingAddress?: ShippingAddressPayload,
  paymentMethod?: string
): Promise<StoreOrder> {
  const response = await fetch(`${API_URL}/orders/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
    body: JSON.stringify({
      cartId,
      customerEmail,
      idempotencyKey,
      shippingAddress,
      paymentMethod,
    }),
  });

  if (!response.ok) {
    let detail = `Checkout failed (${response.status})`;
    try {
      const body = (await response.json()) as ChatApiErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {
      // Non-JSON error body
    }
    throw new Error(detail);
  }

  return (await response.json()) as StoreOrder;
}

export async function fetchStoreOrders(customerEmail?: string): Promise<StoreOrder[]> {
  const url = customerEmail
    ? `${API_URL}/orders?email=${encodeURIComponent(customerEmail)}`
    : `${API_URL}/orders`;
  const response = await fetch(url, {
    headers: {
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
  });

  if (!response.ok) {
    return [];
  }

  try {
    const data = (await response.json()) as { orders?: StoreOrder[] };
    return data.orders ?? [];
  } catch {
    return [];
  }
}
