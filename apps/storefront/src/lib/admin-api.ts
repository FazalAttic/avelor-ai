export type OrderStatus = "pending" | "processing" | "paid" | "failed" | "canceled" | "refunded";
export type ProductStatus = "draft" | "active" | "archived";

export interface AdminMoney {
  readonly amount: number;
  readonly currency: string;
}

export interface AdminOrderItem {
  readonly variantId: string;
  readonly productId: string;
  readonly sku: string;
  readonly title: string;
  readonly unitPrice: AdminMoney;
  readonly quantity: number;
  readonly totalPrice: AdminMoney;
}

export interface AdminShippingAddress {
  readonly fullName: string;
  readonly phone: string;
  readonly country: string;
  readonly line1: string;
  readonly line2: string;
  readonly landmark?: string;
  readonly pincode: string;
  readonly city: string;
  readonly state: string;
  readonly coordinates?: {
    readonly lat: number;
    readonly lng: number;
    readonly accuracy?: number;
  };
  readonly isDefault?: boolean;
}

export interface AdminOrder {
  readonly id: string;
  readonly customerEmail: string;
  readonly items: readonly AdminOrderItem[];
  readonly total: AdminMoney;
  readonly status: OrderStatus;
  readonly shippingAddress?: AdminShippingAddress;
  readonly paymentMethod?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminVariant {
  readonly id: string;
  readonly sku: string;
  readonly title: string;
  readonly price: AdminMoney;
  readonly inventoryQuantity: number;
}

export interface AdminProduct {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: ProductStatus;
  readonly categories: readonly string[];
  readonly media: readonly string[];
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly variants: readonly AdminVariant[];
  readonly createdAt: string;
}

export interface AdminMetrics {
  readonly tenantId: string;
  readonly catalog: {
    readonly totalProducts: number;
    readonly lowStockVariants: number;
  };
  readonly orders: {
    readonly totalOrders: number;
    readonly paidOrders: number;
    readonly revenue: AdminMoney;
  };
}

export type PolicyTopic = "returns" | "shipping" | "privacy" | "terms" | "faq" | "general";

export interface AdminPolicy {
  readonly id: string;
  readonly topic: PolicyTopic;
  readonly title: string;
  readonly content: string;
  readonly updatedAt: string;
}

export interface ProductQuery {
  readonly limit?: number;
  readonly offset?: number;
  readonly search?: string;
  readonly category?: string;
}

export interface NewProduct {
  readonly name: string;
  readonly description: string;
  readonly categories: readonly string[];
  readonly media?: readonly string[];
  readonly attributes?: Record<string, string>;
  readonly variants: readonly {
    sku: string;
    title: string;
    priceAmount: number;
    inventoryQuantity: number;
  }[];
}

interface ApiErrorBody {
  readonly error?: { readonly code?: string; readonly message?: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
const TENANT_ID = process.env.NEXT_PUBLIC_AVELOR_TENANT_ID ?? "store_alpha";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "x-tenant-id": TENANT_ID, ...(init.headers ?? {}) },
    credentials: "include",
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {
      // Non-JSON error body — keep the status-based message
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const fetchMetrics = () => request<AdminMetrics>("/admin/metrics");

export const fetchOrders = () =>
  request<{ orders: readonly AdminOrder[] }>("/admin/orders").then((r) => r.orders);

export const setOrderStatus = (id: string, status: OrderStatus) =>
  request<AdminOrder>(`/admin/orders/${id}/status`, { method: "PATCH", ...json({ status }) });

export function fetchProducts(query: ProductQuery = {}) {
  const params = new URLSearchParams({ limit: String(query.limit ?? 60) });
  if (query.offset) params.set("offset", String(query.offset));
  if (query.search) params.set("q", query.search);
  if (query.category) params.set("category", query.category);
  return request<{ items: readonly AdminProduct[]; total: number }>(
    `/admin/products?${params.toString()}`
  );
}

export const createProduct = (input: NewProduct) =>
  request<AdminProduct>("/admin/products", { method: "POST", ...json(input) });

export interface ProductPatch {
  name?: string;
  description?: string;
  categories?: readonly string[];
  status?: ProductStatus;
  media?: readonly string[];
  attributes?: Record<string, string>;
  variants?: readonly {
    id?: string;
    sku: string;
    title: string;
    priceAmount: number;
    inventoryQuantity: number;
  }[];
}

export const updateProduct = (id: string, patch: ProductPatch) =>
  request<AdminProduct>(`/admin/products/${id}`, { method: "PATCH", ...json(patch) });

export const removeProduct = (id: string) =>
  request<{ status: string; id: string }>(`/admin/products/${id}`, { method: "DELETE" });

export const fetchPolicies = () => request<readonly AdminPolicy[]>("/admin/policies");

export const savePolicy = (topic: PolicyTopic, input: { title: string; content: string }) =>
  request<AdminPolicy>(`/admin/policies/${topic}`, { method: "PUT", ...json(input) });

export interface UploadMediaResult {
  readonly success: boolean;
  readonly url: string;
  readonly rawUrl: string;
  readonly fileId: string;
  readonly filePath: string;
  readonly name: string;
  readonly size: number;
  readonly isMock?: boolean;
}

export async function uploadMedia(file: File): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/media/upload`, {
    method: "POST",
    headers: {
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    let detail = `Upload failed (${response.status})`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.error?.message) detail = body.error.message;
    } catch {}
    throw new Error(detail);
  }

  return (await response.json()) as UploadMediaResult;
}

export function formatMoney(money: AdminMoney): string {
  const value = money.amount / 100;
  return money.currency === "USD"
    ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${value.toLocaleString("en-US")} ${money.currency}`;
}

/** Chart-friendly money: $1.2K instead of $1,234.56 for axis ticks. */
export function formatMoneyCompact(amountCents: number): string {
  const value = amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1000 ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 1000 || value < 10 ? 1 : 0,
  }).format(value);
}
