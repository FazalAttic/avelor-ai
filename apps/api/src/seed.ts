import {
  type CatalogRepository,
  createMoney,
  type PolicyRepository,
  type PolicyTopic,
  type TenantId,
} from "@avelor/core";

interface SeedVariant {
  readonly sku: string;
  readonly title: string;
  readonly amount: number;
  readonly inventoryQuantity: number;
}

interface SeedProduct {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly rating: number;
  readonly reviewsCount: number;
  readonly tags: string[];
  readonly imageUrl: string;
  readonly variants: readonly SeedVariant[];
}

const DEMO_PRODUCTS: readonly SeedProduct[] = [
  {
    name: "Aero Glide Trail Pro",
    description:
      "Engineered high-traction trail running shoe with Gore-Tex waterproof shield and carbon propulsion plate.",
    category: "Footwear",
    rating: 4.9,
    reviewsCount: 142,
    tags: ["running", "trail", "waterproof", "shoes", "footwear"],
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    variants: [
      { sku: "AERO-41-BLK", title: "Size 41 / Obsidian", amount: 13500, inventoryQuantity: 18 },
      { sku: "AERO-42-BLK", title: "Size 42 / Obsidian", amount: 13500, inventoryQuantity: 24 },
      { sku: "AERO-43-BLU", title: "Size 43 / Glacier Blue", amount: 13500, inventoryQuantity: 12 },
      { sku: "AERO-44-BLU", title: "Size 44 / Glacier Blue", amount: 13500, inventoryQuantity: 7 },
    ],
  },
  {
    name: "Alpine Hydro-Shield Shell",
    description:
      "Triple-layer waterproof outdoor jacket with storm sealed zippers and underarm thermoregulation vents.",
    category: "Apparel",
    rating: 4.8,
    reviewsCount: 89,
    tags: ["waterproof", "jacket", "outerwear", "storm", "apparel"],
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80",
    variants: [
      { sku: "ALPN-S-BLK", title: "Small / Stealth Charcoal", amount: 18500, inventoryQuantity: 9 },
      {
        sku: "ALPN-M-BLK",
        title: "Medium / Stealth Charcoal",
        amount: 18500,
        inventoryQuantity: 15,
      },
      { sku: "ALPN-L-GRN", title: "Large / Deep Forest", amount: 18500, inventoryQuantity: 22 },
      { sku: "ALPN-XL-GRN", title: "XL / Deep Forest", amount: 18500, inventoryQuantity: 6 },
    ],
  },
  {
    name: "Artisan Obsidian Espresso Roast",
    description:
      "Single-origin shade-grown Arabica beans with tasting notes of dark chocolate, toasted hazelnut, and black cherry.",
    category: "Coffee",
    rating: 5.0,
    reviewsCount: 310,
    tags: ["coffee", "espresso", "dark roast", "organic", "beans"],
    imageUrl: "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=800&q=80",
    variants: [
      { sku: "COF-WB-500", title: "Whole Bean (500g)", amount: 2200, inventoryQuantity: 50 },
      {
        sku: "COF-FP-500",
        title: "Coarse French Press (500g)",
        amount: 2200,
        inventoryQuantity: 35,
      },
      {
        sku: "COF-ES-500",
        title: "Fine Espresso Grind (500g)",
        amount: 2200,
        inventoryQuantity: 40,
      },
    ],
  },
  {
    name: "Nomad Ultra-Light Daypack 28L",
    description:
      "Ripstop ballistic nylon pack with waterproof roll-top closure, ergonomic harness, and dedicated padded laptop sleeve.",
    category: "Equipment",
    rating: 4.7,
    reviewsCount: 64,
    tags: ["backpack", "travel", "waterproof", "daypack", "equipment"],
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
    variants: [
      { sku: "NMD-28-BLK", title: "Matte Black / 28L", amount: 9500, inventoryQuantity: 14 },
      { sku: "NMD-28-OLV", title: "Forest Olive / 28L", amount: 9500, inventoryQuantity: 11 },
    ],
  },
  {
    name: "Seamless Merino Thermal Tee",
    description:
      "100% Australian Merino wool base layer for odor resistance, natural temperature regulation, and all-day comfort.",
    category: "Apparel",
    rating: 4.9,
    reviewsCount: 95,
    tags: ["merino", "wool", "thermal", "tee", "apparel"],
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80",
    variants: [
      { sku: "MRN-S-SLT", title: "Small / Heather Slate", amount: 5800, inventoryQuantity: 12 },
      { sku: "MRN-M-SLT", title: "Medium / Heather Slate", amount: 5800, inventoryQuantity: 28 },
      { sku: "MRN-L-SLT", title: "Large / Heather Slate", amount: 5800, inventoryQuantity: 19 },
    ],
  },
  {
    name: "Double-Wall Matte Ceramic Tumbler",
    description:
      "Vacuum-insulated ceramic-lined travel mug that keeps beverages hot for 6 hours without imparting metallic aftertaste.",
    category: "Accessories",
    rating: 4.8,
    reviewsCount: 78,
    tags: ["mug", "tumbler", "coffee", "ceramic", "accessories"],
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80",
    variants: [
      { sku: "MUG-12-BLK", title: "12 oz / Charcoal Matte", amount: 2800, inventoryQuantity: 30 },
      { sku: "MUG-16-BLK", title: "16 oz / Charcoal Matte", amount: 3200, inventoryQuantity: 25 },
    ],
  },
];

const DEMO_POLICIES: readonly { topic: PolicyTopic; title: string; content: string }[] = [
  {
    topic: "returns",
    title: "30-Day Hassle-Free Returns",
    content:
      "We offer a straightforward 30-day return policy on all unworn items in original packaging. Store exchanges enjoy free return shipping, while refunds are processed back to your original payment method within 3 to 5 business days.",
  },
  {
    topic: "shipping",
    title: "Free Shipping & Express Dispatch",
    content:
      "Orders over $100.00 qualify for free standard delivery (3-5 business days). Orders placed before 2:00 PM EST ship the same business day from our climate-controlled fulfillment center.",
  },
  {
    topic: "privacy",
    title: "AI Guardrails & Data Privacy",
    content:
      "Our conversational shopping assistant runs with layered guardrails. Customer chat inputs are never used to train public foundational models, and conversations are encrypted in transit and at rest.",
  },
];

// Idempotent: only seeds when the tenant has no products yet, so admin edits
// made through the API are never overwritten on restart.
export async function seedDemoStore(
  catalogRepo: CatalogRepository,
  policyRepo: PolicyRepository,
  tenantId: TenantId
): Promise<void> {
  const existing = await catalogRepo.listProducts(tenantId, { limit: 1 });
  if (existing.total > 0) {
    return;
  }

  for (const input of DEMO_PRODUCTS) {
    const product = await catalogRepo.createProduct({
      tenantId,
      name: input.name,
      description: input.description,
      status: "active",
      categories: [input.category],
      attributes: { rating: input.rating, reviewsCount: input.reviewsCount, tags: input.tags },
      media: [input.imageUrl],
    });

    for (const variant of input.variants) {
      await catalogRepo.createVariant({
        productId: product.id,
        tenantId,
        sku: variant.sku,
        title: variant.title,
        price: createMoney(variant.amount, "USD"),
        inventoryQuantity: variant.inventoryQuantity,
      });
    }
  }

  const policies = await policyRepo.listPolicies(tenantId);
  if (policies.length === 0) {
    for (const policy of DEMO_POLICIES) {
      await policyRepo.upsertPolicy(tenantId, policy);
    }
  }
}
