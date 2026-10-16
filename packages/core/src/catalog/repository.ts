import type { TenantId } from "../tenant";
import type {
  CreateProductInput,
  CreateVariantInput,
  PaginatedResult,
  Product,
  ProductFilter,
  ProductVariant,
  ProductWithVariants,
  UpdateProductInput,
} from "./types";

export interface CatalogRepository {
  createProduct(input: CreateProductInput): Promise<Product>;
  getProduct(tenantId: TenantId, id: string): Promise<Product | null>;
  getProductWithVariants(tenantId: TenantId, id: string): Promise<ProductWithVariants | null>;
  updateProduct(tenantId: TenantId, id: string, input: UpdateProductInput): Promise<Product>;
  deleteProduct(tenantId: TenantId, id: string): Promise<boolean>;
  listProducts(tenantId: TenantId, filter?: ProductFilter): Promise<PaginatedResult<Product>>;

  createVariant(input: CreateVariantInput): Promise<ProductVariant>;
  getVariant(tenantId: TenantId, id: string): Promise<ProductVariant | null>;
  listVariants(tenantId: TenantId, productId: string): Promise<readonly ProductVariant[]>;
  updateInventory(tenantId: TenantId, variantId: string, delta: number): Promise<ProductVariant>;
}
