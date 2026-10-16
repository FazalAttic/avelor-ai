export interface ProductVariant {
  readonly id: string;
  readonly title: string;
  readonly sku: string;
  readonly priceMinor: number; // Integer minor units ($120.00 = 12000)
  readonly inventoryQuantity: number;
}

export interface StoreProduct {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly basePriceMinor: number;
  readonly currency: string;
  readonly imageUrl: string;
  readonly rating: number;
  readonly reviewsCount: number;
  readonly tags: readonly string[];
  readonly variants: readonly ProductVariant[];
  readonly inStock: boolean;
}

export function formatPrice(minorUnits: number, currency = "USD"): string {
  const value = (minorUnits / 100).toFixed(2);
  return `${currency === "USD" ? "$" : `${currency} `}${value}`;
}

export const STORE_CATALOG: readonly StoreProduct[] = [
  {
    id: "prod_aero_shoes",
    name: "Aero Glide Trail Pro",
    description: "Engineered high-traction trail running shoe with Gore-Tex waterproof shield and carbon propulsion plate.",
    category: "Footwear",
    basePriceMinor: 13500, // $135.00
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    rating: 4.9,
    reviewsCount: 142,
    tags: ["running", "trail", "waterproof", "shoes", "footwear"],
    inStock: true,
    variants: [
      { id: "var_shoe_41", title: "Size 41 / Obsidian", sku: "AERO-41-BLK", priceMinor: 13500, inventoryQuantity: 18 },
      { id: "var_shoe_42", title: "Size 42 / Obsidian", sku: "AERO-42-BLK", priceMinor: 13500, inventoryQuantity: 24 },
      { id: "var_shoe_43", title: "Size 43 / Glacier Blue", sku: "AERO-43-BLU", priceMinor: 13500, inventoryQuantity: 12 },
      { id: "var_shoe_44", title: "Size 44 / Glacier Blue", sku: "AERO-44-BLU", priceMinor: 13500, inventoryQuantity: 7 },
    ],
  },
  {
    id: "prod_shell_jacket",
    name: "Alpine Hydro-Shield Shell",
    description: "Triple-layer waterproof outdoor jacket with storm sealed zippers and underarm thermoregulation vents.",
    category: "Apparel",
    basePriceMinor: 18500, // $185.00
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80",
    rating: 4.8,
    reviewsCount: 89,
    tags: ["waterproof", "jacket", "outerwear", "storm", "apparel"],
    inStock: true,
    variants: [
      { id: "var_jkt_s", title: "Small / Stealth Charcoal", sku: "ALPN-S-BLK", priceMinor: 18500, inventoryQuantity: 9 },
      { id: "var_jkt_m", title: "Medium / Stealth Charcoal", sku: "ALPN-M-BLK", priceMinor: 18500, inventoryQuantity: 15 },
      { id: "var_jkt_l", title: "Large / Deep Forest", sku: "ALPN-L-GRN", priceMinor: 18500, inventoryQuantity: 22 },
      { id: "var_jkt_xl", title: "XL / Deep Forest", sku: "ALPN-XL-GRN", priceMinor: 18500, inventoryQuantity: 6 },
    ],
  },
  {
    id: "prod_dark_roast",
    name: "Artisan Obsidian Espresso Roast",
    description: "Single-origin shade-grown Arabica beans with tasting notes of dark chocolate, toasted hazelnut, and black cherry.",
    category: "Coffee",
    basePriceMinor: 2200, // $22.00
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=800&q=80",
    rating: 5.0,
    reviewsCount: 310,
    tags: ["coffee", "espresso", "dark roast", "organic", "beans"],
    inStock: true,
    variants: [
      { id: "var_cof_bean", title: "Whole Bean (500g)", sku: "COF-WB-500", priceMinor: 2200, inventoryQuantity: 50 },
      { id: "var_cof_french", title: "Coarse French Press (500g)", sku: "COF-FP-500", priceMinor: 2200, inventoryQuantity: 35 },
      { id: "var_cof_fine", title: "Fine Espresso Grind (500g)", sku: "COF-ES-500", priceMinor: 2200, inventoryQuantity: 40 },
    ],
  },
  {
    id: "prod_daypack",
    name: "Nomad Ultra-Light Daypack 28L",
    description: "Ripstop ballistic nylon pack with waterproof roll-top closure, ergonomic harness, and dedicated padded laptop sleeve.",
    category: "Equipment",
    basePriceMinor: 9500, // $95.00
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
    rating: 4.7,
    reviewsCount: 64,
    tags: ["backpack", "travel", "waterproof", "daypack", "equipment"],
    inStock: true,
    variants: [
      { id: "var_pack_blk", title: "Matte Black / 28L", sku: "NMD-28-BLK", priceMinor: 9500, inventoryQuantity: 14 },
      { id: "var_pack_olv", title: "Forest Olive / 28L", sku: "NMD-28-OLV", priceMinor: 9500, inventoryQuantity: 11 },
    ],
  },
  {
    id: "prod_merino_tee",
    name: "Seamless Merino Thermal Tee",
    description: "100% Australian Merino wool base layer for odor resistance, natural temperature regulation, and all-day comfort.",
    category: "Apparel",
    basePriceMinor: 5800, // $58.00
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80",
    rating: 4.9,
    reviewsCount: 95,
    tags: ["merino", "wool", "thermal", "tee", "apparel"],
    inStock: true,
    variants: [
      { id: "var_tee_s", title: "Small / Heather Slate", sku: "MRN-S-SLT", priceMinor: 5800, inventoryQuantity: 12 },
      { id: "var_tee_m", title: "Medium / Heather Slate", sku: "MRN-M-SLT", priceMinor: 5800, inventoryQuantity: 28 },
      { id: "var_tee_l", title: "Large / Heather Slate", sku: "MRN-L-SLT", priceMinor: 5800, inventoryQuantity: 19 },
    ],
  },
  {
    id: "prod_ceramic_mug",
    name: "Double-Wall Matte Ceramic Tumbler",
    description: "Vacuum-insulated ceramic-lined travel mug that keeps beverages hot for 6 hours without imparting metallic aftertaste.",
    category: "Accessories",
    basePriceMinor: 2800, // $28.00
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80",
    rating: 4.8,
    reviewsCount: 78,
    tags: ["mug", "tumbler", "coffee", "ceramic", "accessories"],
    inStock: true,
    variants: [
      { id: "var_mug_12", title: "12 oz / Charcoal Matte", sku: "MUG-12-BLK", priceMinor: 2800, inventoryQuantity: 30 },
      { id: "var_mug_16", title: "16 oz / Charcoal Matte", sku: "MUG-16-BLK", priceMinor: 3200, inventoryQuantity: 25 },
    ],
  },
];
