import {
  type CatalogRepository,
  createMoney,
  type Money,
  type OrderItem,
  type OrderRepository,
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
  {
    name: "Apex Pro Wireless Mechanical Keyboard",
    description:
      "Ultra-responsive 75% wireless mechanical gaming keyboard with hot-swappable tactile switches, per-key RGB lighting, and aircraft-grade CNC aluminum chassis. The ultimate setup gift for gamers.",
    category: "Gaming",
    rating: 4.9,
    reviewsCount: 184,
    tags: ["gaming", "gamer", "gift", "keyboard", "mechanical", "rgb", "pc", "electronics"],
    imageUrl: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80",
    variants: [
      {
        sku: "KB-75-TAC",
        title: "Tactile Brown Switches / Stealth Gray",
        amount: 11900,
        inventoryQuantity: 20,
      },
      {
        sku: "KB-75-LIN",
        title: "Linear Red Switches / Stealth Gray",
        amount: 11900,
        inventoryQuantity: 15,
      },
    ],
  },
  {
    name: "Vanguard 7.1 Spatial Audio Gaming Headset",
    description:
      "Tournament-grade wireless gaming headset with 50mm neodymium drivers, 360-degree spatial surround sound, ultra-clear noise-canceling mic, and cooling gel ear cushions.",
    category: "Gaming",
    rating: 4.8,
    reviewsCount: 226,
    tags: ["gaming", "gamer", "gift", "headset", "audio", "headphones", "wireless"],
    imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80",
    variants: [
      {
        sku: "HS-71-BLK",
        title: "Matte Obsidian / 2.4GHz + BT",
        amount: 8900,
        inventoryQuantity: 25,
      },
      { sku: "HS-71-WHT", title: "Lunar White / 2.4GHz + BT", amount: 8900, inventoryQuantity: 18 },
    ],
  },
  {
    name: "Viper Precision Lightweight Gaming Mouse",
    description:
      "Featherweight 59g optical gaming mouse with flawless 26K DPI sensor, optical switches, zero-drag paracord cable, and PTFE glide feet for esports precision.",
    category: "Gaming",
    rating: 4.9,
    reviewsCount: 340,
    tags: ["gaming", "gamer", "gift", "mouse", "fps", "lightweight", "esports"],
    imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80",
    variants: [
      { sku: "MS-VIP-BLK", title: "Matte Carbon", amount: 5900, inventoryQuantity: 35 },
      { sku: "MS-VIP-WHT", title: "Glacier White", amount: 5900, inventoryQuantity: 20 },
    ],
  },
  {
    name: "Titan XXL Water-Resistant Desk Mat",
    description:
      "Extra-large 900x400mm micro-textured cloth gaming surface with non-fray stitched edges, spill-resistant coating, and anti-slip natural rubber base.",
    category: "Gaming",
    rating: 4.8,
    reviewsCount: 152,
    tags: ["gaming", "desk mat", "mousepad", "gamer", "gift", "accessories", "office"],
    imageUrl: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=800&q=80",
    variants: [
      {
        sku: "MAT-XXL-BLK",
        title: "900x400mm / Minimalist Black",
        amount: 2900,
        inventoryQuantity: 45,
      },
      {
        sku: "MAT-XXL-TOPO",
        title: "900x400mm / Topographic Monochrome",
        amount: 3400,
        inventoryQuantity: 40,
      },
    ],
  },
  {
    name: "CloudWeave Heavyweight Fleece Hoodie",
    description:
      "Ultra-plush 450 GSM French Terry cotton hoodie with a double-layered hood, deep kangaroo pocket, and relaxed streetwear drape. Perfect for cold evenings and cozy lounge sessions.",
    category: "Apparel",
    rating: 4.9,
    reviewsCount: 215,
    tags: ["hoodie", "fleece", "cozy", "sweatshirt", "apparel", "winter", "warm"],
    imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
    variants: [
      { sku: "HOD-OAT-S", title: "Oatmeal Heather / Small", amount: 7800, inventoryQuantity: 14 },
      { sku: "HOD-OAT-M", title: "Oatmeal Heather / Medium", amount: 7800, inventoryQuantity: 22 },
      { sku: "HOD-OAT-L", title: "Oatmeal Heather / Large", amount: 7800, inventoryQuantity: 18 },
      {
        sku: "HOD-VBLK-M",
        title: "Vintage Washed Black / Medium",
        amount: 7800,
        inventoryQuantity: 25,
      },
      {
        sku: "HOD-VBLK-L",
        title: "Vintage Washed Black / Large",
        amount: 7800,
        inventoryQuantity: 20,
      },
    ],
  },
  {
    name: "Summit Thermal Sherpa Zip Jacket",
    description:
      "High-pile recycled sherpa fleece jacket with wind-blocking ripstop chest overlay, zippered handwarmer pockets, and heat-trapping elasticized cuffs.",
    category: "Apparel",
    rating: 4.8,
    reviewsCount: 118,
    tags: ["jacket", "sherpa", "fleece", "cozy", "warm", "outerwear", "winter", "apparel"],
    imageUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80",
    variants: [
      { sku: "SHP-CRM-M", title: "Medium / Natural Cream", amount: 9800, inventoryQuantity: 12 },
      { sku: "SHP-CRM-L", title: "Large / Natural Cream", amount: 9800, inventoryQuantity: 16 },
      { sku: "SHP-OLV-L", title: "Large / Deep Evergreen", amount: 9800, inventoryQuantity: 10 },
    ],
  },
  {
    name: "Stratus Pace Neutral Road Runner",
    description:
      "Lightweight and springy road running shoes with responsive supercritical foam cushioning and breathable engineered mesh upper. Built for daily training and 5K to marathon efforts.",
    category: "Footwear",
    rating: 4.7,
    reviewsCount: 175,
    tags: ["running", "shoes", "sneakers", "footwear", "under 100", "cushion", "lightweight"],
    imageUrl: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80",
    variants: [
      { sku: "STR-41-WHT", title: "Size 41 / Cloud White", amount: 8500, inventoryQuantity: 20 },
      { sku: "STR-42-WHT", title: "Size 42 / Cloud White", amount: 8500, inventoryQuantity: 28 },
      { sku: "STR-43-BLK", title: "Size 43 / Midnight Black", amount: 8500, inventoryQuantity: 24 },
      { sku: "STR-44-BLK", title: "Size 44 / Midnight Black", amount: 8500, inventoryQuantity: 16 },
    ],
  },
  {
    name: "TerraFlex Minimalist Trail Shoe",
    description:
      "Zero-drop natural movement trail runner with wide anatomical toe box, flexible rock guard shield, and grippy multi-directional Chevron lugs.",
    category: "Footwear",
    rating: 4.8,
    reviewsCount: 93,
    tags: ["running", "trail", "shoes", "zero drop", "footwear", "minimalist", "under 100"],
    imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80",
    variants: [
      { sku: "TFX-42-OLV", title: "Size 42 / Sage Khaki", amount: 7500, inventoryQuantity: 15 },
      { sku: "TFX-43-OLV", title: "Size 43 / Sage Khaki", amount: 7500, inventoryQuantity: 19 },
    ],
  },
  {
    name: "Aura Spatial ANC Wireless Headphones",
    description:
      "Studio-quality hybrid active noise-canceling headphones with 40mm custom titanium drivers, 45-hour battery life, and plush memory foam headband.",
    category: "Electronics",
    rating: 4.9,
    reviewsCount: 280,
    tags: ["headphones", "audio", "anc", "wireless", "electronics", "music", "bluetooth"],
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    variants: [
      { sku: "AUR-ANC-BLK", title: "Matte Carbon Black", amount: 14900, inventoryQuantity: 22 },
      { sku: "AUR-ANC-SIL", title: "Brushed Platinum", amount: 14900, inventoryQuantity: 14 },
    ],
  },
  {
    name: "Orbit 3-in-1 Fast Wireless Charging Station",
    description:
      "Weighted anodized aluminum charging dock that wirelessly powers phone, smartwatch, and wireless earbuds simultaneously using MagSafe precision magnetic alignment.",
    category: "Electronics",
    rating: 4.8,
    reviewsCount: 164,
    tags: ["charger", "wireless", "magsafe", "electronics", "desk", "tech", "accessories", "gift"],
    imageUrl: "https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=800&q=80",
    variants: [
      { sku: "ORB-3IN1-GRY", title: "Space Gray Aluminum", amount: 6900, inventoryQuantity: 30 },
      { sku: "ORB-3IN1-SLV", title: "Silver Aluminum", amount: 6900, inventoryQuantity: 25 },
    ],
  },
  {
    name: "Barista Precision Variable Temperature Kettle",
    description:
      "1.0L matte gooseneck electric kettle with 1-degree precision digital temperature control, LCD display, balanced pour spout, and 60-minute heat maintain mode.",
    category: "Coffee",
    rating: 4.9,
    reviewsCount: 195,
    tags: ["coffee", "kettle", "pour over", "tea", "kitchen", "barista", "accessories"],
    imageUrl: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=800&q=80",
    variants: [
      { sku: "KTL-VAR-BLK", title: "1.0L / Matte Obsidian", amount: 8900, inventoryQuantity: 20 },
      { sku: "KTL-VAR-WHT", title: "1.0L / Matte Bone", amount: 8900, inventoryQuantity: 15 },
    ],
  },
  {
    name: "Precision Conical Burr Manual Hand Grinder",
    description:
      "Aviation aluminum coffee hand grinder with dual ball bearing stabilization and 48-click micro-adjustment stainless steel conical burrs.",
    category: "Coffee",
    rating: 4.8,
    reviewsCount: 140,
    tags: ["coffee", "grinder", "espresso", "manual", "coffee gear", "gift"],
    imageUrl: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&q=80",
    variants: [
      { sku: "GRN-BURR-SLV", title: "Machined Titanium Gray", amount: 6400, inventoryQuantity: 18 },
    ],
  },
  {
    name: "Pro-Grip Alignment Natural Rubber Yoga Mat",
    description:
      "5mm thick non-slip eco-friendly natural tree rubber exercise and yoga mat with laser-etched alignment guides and sweat-activated grip.",
    category: "Fitness",
    rating: 4.9,
    reviewsCount: 112,
    tags: ["yoga", "fitness", "mat", "workout", "exercise", "wellness"],
    imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80",
    variants: [
      { sku: "YOG-MAT-SLT", title: "5mm / Slate Charcoal", amount: 5200, inventoryQuantity: 25 },
      { sku: "YOG-MAT-SGE", title: "5mm / Eucalyptus Green", amount: 5200, inventoryQuantity: 20 },
    ],
  },
  {
    name: "Insulated Sport Chug Steel Bottle 32oz",
    description:
      "Triple-insulated stainless steel hydration bottle keeping drinks ice cold for 24 hours. Leakproof high-flow chug cap with integrated carry handle.",
    category: "Accessories",
    rating: 4.8,
    reviewsCount: 204,
    tags: ["water bottle", "flask", "insulated", "gym", "fitness", "accessories", "under 100"],
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
    variants: [
      { sku: "BTL-32-BLK", title: "32 oz / Matte Black", amount: 3400, inventoryQuantity: 40 },
      { sku: "BTL-32-BLU", title: "32 oz / Pacific Blue", amount: 3400, inventoryQuantity: 35 },
    ],
  },
  {
    name: "Aromatherapy Ultrasonic Stone Diffuser",
    description:
      "Handcrafted matte ceramic ultrasonic essential oil diffuser with ambient warm LED glow, whisper-quiet operation, and auto shut-off.",
    category: "Home",
    rating: 4.8,
    reviewsCount: 133,
    tags: ["diffuser", "home", "aromatherapy", "wellness", "ceramic", "gift", "cozy"],
    imageUrl: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80",
    variants: [
      { sku: "DIF-CER-WHT", title: "Warm Alabaster White", amount: 4800, inventoryQuantity: 22 },
      { sku: "DIF-CER-TER", title: "Terracotta Clay", amount: 4800, inventoryQuantity: 16 },
    ],
  },
  {
    name: "Merino Ribbed Knit Midi Dress",
    description:
      "Elegant and versatile long-sleeve ribbed knit midi dress crafted from ultra-soft fine Merino wool. Flattering silhouette for day-to-night wear.",
    category: "Apparel",
    rating: 4.9,
    reviewsCount: 88,
    tags: ["dress", "midi dress", "knit", "apparel", "women", "clothing", "wear"],
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
    variants: [
      { sku: "DRS-KNT-S", title: "Small / Heather Charcoal", amount: 8800, inventoryQuantity: 15 },
      { sku: "DRS-KNT-M", title: "Medium / Heather Charcoal", amount: 8800, inventoryQuantity: 20 },
      { sku: "DRS-KNT-L", title: "Large / Heather Charcoal", amount: 8800, inventoryQuantity: 12 },
    ],
  },
  {
    name: "Relaxed Washed Linen Shirt Dress",
    description:
      "Breathable 100% French washed linen shirt dress with cuffed sleeves, button-down front, and belted waist. Effortless everyday comfort and casual elegance.",
    category: "Apparel",
    rating: 4.8,
    reviewsCount: 104,
    tags: ["dress", "shirt dress", "linen", "apparel", "clothing", "wear", "summer"],
    imageUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80",
    variants: [
      { sku: "DRS-LIN-S", title: "Small / Natural Sand", amount: 9500, inventoryQuantity: 18 },
      { sku: "DRS-LIN-M", title: "Medium / Natural Sand", amount: 9500, inventoryQuantity: 22 },
      { sku: "DRS-LIN-L", title: "Large / Natural Sand", amount: 9500, inventoryQuantity: 14 },
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

// Idempotent: seeds any demo products that do not already exist in the tenant catalog,
// preserving any custom products or admin edits made through the API.
export async function seedDemoStore(
  catalogRepo: CatalogRepository,
  policyRepo: PolicyRepository,
  tenantId: TenantId
): Promise<void> {
  const existing = await catalogRepo.listProducts(tenantId, { limit: 100 });
  const existingNames = new Set(existing.items.map((p) => p.name.trim().toLowerCase()));

  for (const input of DEMO_PRODUCTS) {
    if (existingNames.has(input.name.trim().toLowerCase())) {
      continue;
    }

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

const DEMO_BUYERS = [
  "maya.reyes@hey.com",
  "j.okafor@fastmail.com",
  "lin.wei@proton.me",
  "sofia.brandt@gmail.com",
  "theo.lacroix@outlook.com",
  "ana.costa@hey.com",
  "idris.khan@fastmail.com",
  "nora.halvorsen@proton.me",
];

// Fixed seed keeps the demo series identical across restarts.
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 86_400_000;

function pick<T>(items: readonly T[], r: number): T {
  const item = items[Math.floor(r * items.length) % items.length];
  if (item === undefined) {
    throw new Error("Avelor seed: expected a non-empty demo collection");
  }
  return item;
}

/**
 * Backfills ~40 orders across the last 30 days so the admin console has real
 * revenue history to aggregate. Skipped entirely if any order already exists.
 */
export async function seedDemoOrders(
  orderRepo: OrderRepository,
  catalogRepo: CatalogRepository,
  tenantId: TenantId
): Promise<void> {
  const existing = await orderRepo.listOrders(tenantId);
  if (existing.length > 0) {
    return;
  }

  const { items: products } = await catalogRepo.listProducts(tenantId, { limit: 100 });
  const purchasable: {
    productId: string;
    variantId: string;
    sku: string;
    title: string;
    price: Money;
  }[] = [];
  for (const product of products) {
    for (const variant of await catalogRepo.listVariants(tenantId, product.id)) {
      purchasable.push({
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        title: variant.title,
        price: variant.price,
      });
    }
  }
  if (purchasable.length === 0) {
    return;
  }

  const rand = mulberry32(20261017);
  const now = Date.now();

  for (let index = 0; index < 40; index++) {
    // pow() skews placements toward today, so the trend line reads as growth.
    const daysAgo = 29 * rand() ** 1.6;
    const createdAt = new Date(now - daysAgo * DAY_MS - rand() * 0.8 * DAY_MS);

    const lineCount = 1 + Math.floor(rand() * 2);
    const items: OrderItem[] = [];
    for (let line = 0; line < lineCount; line++) {
      const variant = pick(purchasable, rand());
      const quantity = 1 + Math.floor(rand() * 2);
      items.push({
        variantId: variant.variantId,
        productId: variant.productId,
        sku: variant.sku,
        title: variant.title,
        unitPrice: variant.price,
        quantity,
        totalPrice: createMoney(variant.price.amount * quantity, variant.price.currency),
      });
    }

    const total = createMoney(
      items.reduce((sum, item) => sum + item.totalPrice.amount, 0),
      "USD"
    );

    const order = await orderRepo.createOrder({
      tenantId,
      cartId: `seed_cart_${index}`,
      customerEmail: pick(DEMO_BUYERS, (index % DEMO_BUYERS.length) / DEMO_BUYERS.length),
      items,
      total,
      createdAt,
    });

    const roll = rand();
    if (roll < 0.78) {
      await orderRepo.updateOrderStatus(tenantId, order.id, "paid", `seed_ps_${index}`);
    } else if (roll < 0.9) {
      await orderRepo.updateOrderStatus(tenantId, order.id, "processing");
    } else if (roll < 0.97) {
      await orderRepo.updateOrderStatus(tenantId, order.id, "canceled");
    }
    // the remainder stays pending
  }
}
