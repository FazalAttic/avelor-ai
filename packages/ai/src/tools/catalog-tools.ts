import {
  type CatalogRepository,
  formatMoney,
  type PolicyRepository,
  type PolicyTopic,
  type TenantId,
} from "@avelor/core";
import type { EmbeddingModel } from "../contracts/embedding";
import type { ToolDefinition } from "../contracts/model";
import type { VectorStore } from "../contracts/vector-store";

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

export const GET_STORE_POLICY_TOOL: ToolDefinition = {
  name: "get_store_policy",
  description:
    "Retrieve authoritative store policies including return windows, refund rules, shipping costs, delivery times, and FAQs.",
  parameters: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        enum: ["returns", "shipping", "privacy", "terms", "faq", "general"],
        description: "The policy topic to retrieve (e.g. 'returns', 'shipping', 'faq')",
      },
    },
    required: ["topic"],
  },
};

export const CATALOG_TOOLS: readonly ToolDefinition[] = Object.freeze([
  SEARCH_PRODUCTS_TOOL,
  GET_PRODUCT_DETAILS_TOOL,
  GET_STORE_POLICY_TOOL,
]);

export interface ToolExecutorContext {
  readonly tenantId: TenantId;
  readonly catalogRepo: CatalogRepository;
  readonly policyRepo?: PolicyRepository | undefined;
  readonly embeddingModel?: EmbeddingModel | undefined;
  readonly vectorStore?: VectorStore | undefined;
}

export async function executeToolCall(
  name: string,
  args: Readonly<Record<string, unknown>>,
  context: ToolExecutorContext
): Promise<string> {
  const { tenantId, catalogRepo } = context;

  switch (name) {
    case "search_products": {
      const rawQuery = args.query ?? args.keyword ?? args.q;
      const query = typeof rawQuery === "string" ? rawQuery.trim() : undefined;
      const rawCategory = args.category ?? args.categorySlug;
      const category = typeof rawCategory === "string" ? rawCategory.trim() : undefined;
      // Bounded output ceiling: max 10 products
      const rawLimit = typeof args.limit === "number" ? Math.floor(args.limit) : 5;
      const limit = Math.max(1, Math.min(rawLimit, 10));

      // 1. Structured keyword search
      const result = await catalogRepo.listProducts(tenantId, {
        query,
        category,
        status: "active",
        limit,
      });

      const matchedIds = new Set(result.items.map((p) => p.id));
      const combinedItems = [...result.items];

      // 2. Hybrid semantic vector search
      if (query && context.embeddingModel && context.vectorStore && combinedItems.length < limit) {
        try {
          const { embeddings } = await context.embeddingModel.embed({
            texts: [query],
            taskType: "query",
          });
          const queryVec = embeddings[0];
          if (queryVec && queryVec.length > 0) {
            const vectorHits = await context.vectorStore.search(queryVec, {
              tenantId,
              topK: limit,
              minScore: 0.35,
            });

            for (const hit of vectorHits) {
              if (combinedItems.length >= limit) {
                break;
              }
              if (!matchedIds.has(hit.id)) {
                const prod = await catalogRepo.getProductWithVariants(tenantId, hit.id);
                if (prod && prod.status === "active") {
                  matchedIds.add(hit.id);
                  combinedItems.push(prod);
                }
              }
            }
          }
        } catch {
          // Gracefully fallback to keyword search results if vector search encounters an issue
        }
      }

      if (combinedItems.length === 0) {
        return JSON.stringify({
          status: "empty",
          message: "No products matched the given criteria.",
          count: 0,
        });
      }

      // Format bounded, grounded summary
      const items = combinedItems.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        categories: p.categories,
        attributes: p.attributes,
      }));

      return JSON.stringify({
        status: "success",
        total: Math.max(result.total, items.length),
        count: items.length,
        products: items,
      });
    }

    case "get_product_details": {
      const rawProductId = args.productId ?? args.id ?? args.product_id;
      const productId = typeof rawProductId === "string" ? rawProductId.trim() : "";
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
              formatted: formatMoney(v.price),
            },
            inStock: v.inventoryQuantity > 0,
            stockQuantity: v.inventoryQuantity,
          })),
        },
      });
    }

    case "get_store_policy": {
      const topic =
        typeof args.topic === "string" ? (args.topic.toLowerCase() as PolicyTopic) : "general";

      if (context.policyRepo) {
        const policy = await context.policyRepo.getPolicy(tenantId, topic);
        if (policy) {
          return JSON.stringify({
            status: "success",
            topic: policy.topic,
            title: policy.title,
            content: policy.content,
            updatedAt: policy.updatedAt.toISOString(),
          });
        }
      }

      // Sensible standard fallback when policy is not yet explicitly written
      return JSON.stringify({
        status: "default",
        topic,
        message:
          topic === "returns"
            ? "Standard store policy: items in original condition may be returned or exchanged within 30 days of delivery."
            : topic === "shipping"
              ? "Standard store shipping: orders are processed in 1-2 business days with standard tracked delivery."
              : "Standard store customer satisfaction policy applies.",
      });
    }

    default:
      return JSON.stringify({
        status: "error",
        message: `Unknown or disallowed tool: ${name}`,
      });
  }
}
