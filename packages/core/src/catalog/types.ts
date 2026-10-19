import type { Money } from "../money";
import type { TenantId } from "../tenant";

export type ProductStatus = "draft" | "active" | "archived";

export type AttributeValue = string | number | boolean | string[];

export interface Product {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly description: string;
  readonly status: ProductStatus;
  readonly categories: readonly string[];
  readonly attributes: Readonly<Record<string, AttributeValue>>;
  readonly media: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProductVariant {
  readonly id: string;
  readonly productId: string;
  readonly tenantId: TenantId;
  readonly sku: string;
  readonly title: string;
  readonly price: Money;
  readonly inventoryQuantity: number;
  readonly attributes: Readonly<Record<string, AttributeValue>>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProductWithVariants extends Product {
  readonly variants: readonly ProductVariant[];
}

export interface CreateProductInput {
  readonly tenantId: TenantId;
  readonly name: string;
  readonly description?: string | undefined;
  readonly status?: ProductStatus | undefined;
  readonly categories?: string[] | undefined;
  readonly attributes?: Record<string, AttributeValue> | undefined;
  readonly media?: string[] | undefined;
}

export interface UpdateProductInput {
  readonly name?: string | undefined;
  readonly description?: string | undefined;
  readonly status?: ProductStatus | undefined;
  readonly categories?: string[] | undefined;
  readonly attributes?: Record<string, AttributeValue> | undefined;
  readonly media?: string[] | undefined;
}

export interface CreateVariantInput {
  readonly productId: string;
  readonly tenantId: TenantId;
  readonly sku: string;
  readonly title: string;
  readonly price: Money;
  readonly inventoryQuantity: number;
  readonly attributes?: Record<string, AttributeValue> | undefined;
}

export interface UpdateVariantInput {
  readonly sku?: string | undefined;
  readonly title?: string | undefined;
  readonly price?: Money | undefined;
  readonly inventoryQuantity?: number | undefined;
  readonly attributes?: Record<string, AttributeValue> | undefined;
}

export interface ProductFilter {
  readonly query?: string | undefined;
  readonly status?: ProductStatus | undefined;
  readonly category?: string | undefined;
  readonly minPrice?: number | undefined;
  readonly maxPrice?: number | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}
