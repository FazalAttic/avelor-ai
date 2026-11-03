"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type MarqueeProduct = {
  name: string;
  price: string;
  image: string;
  href: string;
};

const DEFAULT_PRODUCTS: MarqueeProduct[] = [
  {
    name: "Volt Runner",
    price: "$129",
    image: "/products/volt-runner.png",
    href: "/product/volt-runner",
  },
  {
    name: "Pulse Buds",
    price: "$79",
    image: "/products/pulse-buds.png",
    href: "/product/pulse-buds",
  },
  {
    name: "Aura Watch",
    price: "$199",
    image: "/products/aura-watch.png",
    href: "/product/aura-watch",
  },
  {
    name: "Drift Hoodie",
    price: "$89",
    image: "/products/drift-hoodie.png",
    href: "/product/drift-hoodie",
  },
  {
    name: "Trail Pack",
    price: "$59",
    image: "/products/trail-pack.png",
    href: "/product/trail-pack",
  },
  { name: "Arc Cap", price: "$29", image: "/products/arc-cap.png", href: "/product/arc-cap" },
];

// Deterministic float rhythm (duration/delay in seconds) — stable between SSR and client.
const FLOAT_RHYTHM = [
  { duration: 7, delay: 0 },
  { duration: 8, delay: 1.4 },
  { duration: 6.5, delay: 0.7 },
  { duration: 8.5, delay: 2.1 },
  { duration: 7.5, delay: 1.1 },
  { duration: 9, delay: 0.3 },
];

export type ProductMarqueeProps = {
  products?: MarqueeProduct[];
  className?: string;
};

export function ProductMarquee({ products: productsProp, className }: ProductMarqueeProps) {
  const [liveProducts, setLiveProducts] = useState<MarqueeProduct[] | null>(null);

  useEffect(() => {
    if (productsProp) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
    const tenantId = process.env.NEXT_PUBLIC_AVELOR_TENANT_ID ?? "store_alpha";

    fetch(`${apiUrl}/products?include=variants&status=active&limit=20`, {
      headers: { "x-tenant-id": tenantId },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.items || !Array.isArray(data.items) || data.items.length === 0) return;
        const mapped: MarqueeProduct[] = data.items.map(
          (p: {
            id: string;
            name: string;
            media?: string[];
            variants?: { price?: { amount?: number; currency?: string } }[];
          }) => {
            const firstVariant = p.variants?.[0];
            const priceAmount = firstVariant?.price?.amount ?? 0;
            const currency = firstVariant?.price?.currency ?? "USD";
            const formattedPrice =
              currency === "USD"
                ? `$${Math.round(priceAmount / 100)}`
                : `${priceAmount / 100} ${currency}`;

            return {
              name: p.name,
              price: formattedPrice,
              image: p.media?.[0] || "/products/volt-runner.png",
              href: `/product/${p.id}`,
            };
          }
        );
        if (mapped.length > 0) {
          setLiveProducts(mapped);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_PRODUCTS on error or initial load
      });
  }, [productsProp]);

  const products = productsProp ?? liveProducts ?? DEFAULT_PRODUCTS;

  // The track must stay wider than viewport + one copy, or the screen drains
  // empty near the end of each cycle. 8 copies covers 4K widths; the drift
  // duration in globals.css is scaled to match (speed = copies-per-cycle).
  const COPIES = 8;
  const loop = Array.from({ length: COPIES }, () => products).flat();

  return (
    <div
      className={cn(
        "marquee pointer-events-none absolute inset-x-0 top-20 z-10 overflow-hidden md:top-16",
        "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className
      )}
    >
      <div className="marquee-track flex w-max items-center gap-5 py-4 pr-5 md:gap-12 md:py-7 md:pr-12">
        {loop.map((product, index) => {
          const duplicate = index >= products.length;
          const rhythm = FLOAT_RHYTHM[index % FLOAT_RHYTHM.length] ?? { duration: 7, delay: 0 };
          return (
            <Link
              key={`${product.name}-${index}`}
              href={product.href}
              title={product.name}
              aria-hidden={duplicate || undefined}
              tabIndex={duplicate ? -1 : undefined}
              className="product-marquee-item group pointer-events-auto relative block shrink-0 transition-[filter,opacity] duration-500 ease-expo"
            >
              <div
                className="float-soft relative"
                style={{
                  animationDuration: `${rhythm.duration}s`,
                  animationDelay: `${rhythm.delay}s`,
                }}
              >
                <div className="relative size-20 overflow-hidden rounded-full bg-surface shadow-card ring-1 ring-border/70 transition-all duration-300 ease-expo group-hover:scale-105 group-hover:shadow-pop group-hover:ring-border-strong md:size-36">
                  <Image
                    src={product.image}
                    alt={duplicate ? "" : product.name}
                    fill
                    sizes="(max-width: 768px) 80px, 144px"
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-surface px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-card">
                  {product.price}
                </span>
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background opacity-0 transition-opacity duration-200 ease-expo group-hover:opacity-100">
                  {product.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
