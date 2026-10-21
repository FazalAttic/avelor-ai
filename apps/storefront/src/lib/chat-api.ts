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
