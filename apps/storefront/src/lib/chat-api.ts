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
  history: readonly ChatHistoryMessage[]
): Promise<ChatApiResponse> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
    },
    body: JSON.stringify({ message, history }),
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
