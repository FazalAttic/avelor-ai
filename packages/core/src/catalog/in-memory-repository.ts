import type { TenantId } from "../tenant";
import type { CatalogRepository } from "./repository";
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
import { validateProductInput, validateVariantInput } from "./validation";

// ponytail: in-memory repository ceiling: stores items in a JS Map with O(n) filtering.
// Acceptable for unit tests and local dev without external database.
// Upgrade path: PostgreSQL CatalogRepository with indexed queries and pg_trgm full-text search.

export class InMemoryCatalogRepository implements CatalogRepository {
  private products = new Map<string, Product>();
  private variants = new Map<string, ProductVariant>();

  async createProduct(input: CreateProductInput): Promise<Product> {
    validateProductInput(input);
    const id = `prod_${crypto.randomUUID()}`;
    const now = new Date();

    const product: Product = {
      id,
      tenantId: input.tenantId,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      status: input.status ?? "draft",
      categories: Object.freeze([...(input.categories ?? [])]),
      attributes: Object.freeze({ ...(input.attributes ?? {}) }),
      media: Object.freeze([...(input.media ?? [])]),
      createdAt: now,
      updatedAt: now,
    };

    this.products.set(id, product);
    return product;
  }

  async getProduct(tenantId: TenantId, id: string): Promise<Product | null> {
    const product = this.products.get(id);
    if (!product || product.tenantId !== tenantId) {
      return null;
    }
    return product;
  }

  async getProductWithVariants(
    tenantId: TenantId,
    id: string
  ): Promise<ProductWithVariants | null> {
    const product = await this.getProduct(tenantId, id);
    if (!product) return null;

    const variants = await this.listVariants(tenantId, id);
    return {
      ...product,
      variants,
    };
  }

  async updateProduct(tenantId: TenantId, id: string, input: UpdateProductInput): Promise<Product> {
    const existing = await this.getProduct(tenantId, id);
    if (!existing) {
      throw new Error(`Product not found: ${id}`);
    }

    const updated: Product = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description:
        input.description !== undefined ? input.description.trim() : existing.description,
      status: input.status ?? existing.status,
      categories: input.categories ? Object.freeze([...input.categories]) : existing.categories,
      attributes: input.attributes ? Object.freeze({ ...input.attributes }) : existing.attributes,
      media: input.media ? Object.freeze([...input.media]) : existing.media,
      updatedAt: new Date(),
    };

    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(tenantId: TenantId, id: string): Promise<boolean> {
    const existing = await this.getProduct(tenantId, id);
    if (!existing) return false;

    // Remove associated variants
    for (const [vId, variant] of this.variants.entries()) {
      if (variant.productId === id && variant.tenantId === tenantId) {
        this.variants.delete(vId);
      }
    }

    return this.products.delete(id);
  }

  async listProducts(
    tenantId: TenantId,
    filter: ProductFilter = {}
  ): Promise<PaginatedResult<Product>> {
    const limit = Math.max(1, Math.min(filter.limit ?? 20, 100));
    const offset = Math.max(0, filter.offset ?? 0);

    const matching: Product[] = [];

    for (const product of this.products.values()) {
      // 1. Strict tenant isolation check
      if (product.tenantId !== tenantId) continue;

      // 2. Status filter
      if (filter.status && product.status !== filter.status) continue;

      // 3. Category filter
      if (filter.category && !product.categories.includes(filter.category)) {
        continue;
      }

      // 4. Text search in name or description (case-insensitive substring)
      if (filter.query) {
        const q = filter.query.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) continue;
      }

      matching.push(product);
    }

    const total = matching.length;
    const paginated = matching.slice(offset, offset + limit);

    return {
      items: Object.freeze(paginated),
      total,
      limit,
      offset,
    };
  }

  async createVariant(input: CreateVariantInput): Promise<ProductVariant> {
    validateVariantInput(input);

    const product = await this.getProduct(input.tenantId, input.productId);
    if (!product) {
      throw new Error(`Product not found: ${input.productId}`);
    }

    // Ensure SKU is unique per tenant
    for (const v of this.variants.values()) {
      if (v.tenantId === input.tenantId && v.sku.toLowerCase() === input.sku.toLowerCase()) {
        throw new Error(`SKU already exists: ${input.sku}`);
      }
    }

    const id = `var_${crypto.randomUUID()}`;
    const now = new Date();

    const variant: ProductVariant = {
      id,
      productId: input.productId,
      tenantId: input.tenantId,
      sku: input.sku.trim(),
      title: input.title.trim(),
      price: input.price,
      inventoryQuantity: input.inventoryQuantity,
      attributes: Object.freeze({ ...(input.attributes ?? {}) }),
      createdAt: now,
      updatedAt: now,
    };

    this.variants.set(id, variant);
    return variant;
  }

  async getVariant(tenantId: TenantId, id: string): Promise<ProductVariant | null> {
    const variant = this.variants.get(id);
    if (!variant || variant.tenantId !== tenantId) {
      return null;
    }
    return variant;
  }

  async listVariants(tenantId: TenantId, productId: string): Promise<readonly ProductVariant[]> {
    const results: ProductVariant[] = [];
    for (const variant of this.variants.values()) {
      if (variant.tenantId === tenantId && variant.productId === productId) {
        results.push(variant);
      }
    }
    return Object.freeze(results);
  }

  async updateInventory(
    tenantId: TenantId,
    variantId: string,
    delta: number
  ): Promise<ProductVariant> {
    const variant = await this.getVariant(tenantId, variantId);
    if (!variant) {
      throw new Error(`Variant not found: ${variantId}`);
    }

    const newQty = variant.inventoryQuantity + delta;
    if (newQty < 0) {
      throw new Error(
        `Insufficient inventory for variant ${variantId}: requested delta ${delta}, current stock ${variant.inventoryQuantity}`
      );
    }

    const updated: ProductVariant = {
      ...variant,
      inventoryQuantity: newQty,
      updatedAt: new Date(),
    };

    this.variants.set(variantId, updated);
    return updated;
  }
}
