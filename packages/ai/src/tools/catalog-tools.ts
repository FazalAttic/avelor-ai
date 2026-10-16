import type { CatalogRepository, TenantId } from "@avelor/core";
import type { ToolDefinition } from "../contracts/model";

export const SEARCH_PRODUCTS_TOOL: ToolDefinition = {
  name: "search_products",
  description:
    "Search the store catalog for products by keyword, category, or filter. Returns matching products with IDs and price ranges.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search keyword or term (e.g. 'coffee grinder', 'shoes')",
      },
      category: {
        type: "string",
        description: "Filter by category slug or name (e.g. 'electronics', 'apparel')",
      },
      limit: {
        type: "number",
        description: "Maximum number of products to return (default 5, max 10)",
      },
    },
  },
};

export const GET_PRODUCT_DETAILS_TOOL: ToolDefinition = {
  name: "get_product_details",
  description:
    "Retrieve authoritative details for a specific product including description, variants, price, and stock levels.",
  parameters: {
    type: "object",
    properties: {
      productId: {
        type: "string",
        description: "The unique product ID (e.g. 'prod_123')",
      },
    },
    required: ["productId"],
  },
};

export const CATALOG_TOOLS: readonly ToolDefinition[] = Object.freeze([
  SEARCH_PRODUCTS_TOOL,
  GET_PRODUCT_DETAILS_TOOL,
]);

export interface ToolExecutorContext {
  readonly tenantId: TenantId;
  readonly catalogRepo: CatalogRepository;
}

export async function executeToolCall(
  name: string,
  args: Readonly<Record<string, unknown>>,
  context: ToolExecutorContext
): Promise<string> {
  const { tenantId, catalogRepo } = context;

  switch (name) {
    case "search_products": {
      const query = typeof args.query === "string" ? args.query.trim() : undefined;
      const category = typeof args.category === "string" ? args.category.trim() : undefined;
      // Bounded output ceiling: max 10 products
      const rawLimit = typeof args.limit === "number" ? Math.floor(args.limit) : 5;
      const limit = Math.max(1, Math.min(rawLimit, 10));

      const result = await catalogRepo.listProducts(tenantId, {
        query,
        category,
        status: "active",
        limit,
      });

      if (result.items.length === 0) {
        return JSON.stringify({
          status: "empty",
          message: "No products matched the given criteria.",
          count: 0,
        });
      }

      // Format bounded, grounded summary
      const items = result.items.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        categories: p.categories,
        attributes: p.attributes,
      }));

      return JSON.stringify({
        status: "success",
        total: result.total,
        count: items.length,
        products: items,
      });
    }

    case "get_product_details": {
      const productId = typeof args.productId === "string" ? args.productId.trim() : "";
      if (!productId) {
        return JSON.stringify({
          status: "error",
          message: "productId parameter is required",
        });
      }

      const product = await catalogRepo.getProductWithVariants(tenantId, productId);
      if (!product) {
        return JSON.stringify({
          status: "not_found",
          message: `Product with ID '${productId}' was not found in this store.`,
        });
      }

      return JSON.stringify({
        status: "success",
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          status: product.status,
          categories: product.categories,
          attributes: product.attributes,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            title: v.title,
            price: {
              amount: v.price.amount,
              currency: v.price.currency,
              formatted: `${(v.price.amount / 100).toFixed(2)} ${v.price.currency}`,
            },
            inStock: v.inventoryQuantity > 0,
            stockQuantity: v.inventoryQuantity,
          })),
        },
      });
    }

    default:
      return JSON.stringify({
        status: "error",
        message: `Unknown or disallowed tool: ${name}`,
      });
  }
}
