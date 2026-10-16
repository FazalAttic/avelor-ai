"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Star, Check, ShoppingBag, Sparkles } from "lucide-react";
import type { StoreProduct, ProductVariant } from "../data/catalog";
import { formatPrice } from "../data/catalog";
import { useCart } from "../context/CartContext";

interface ProductCardProps {
  product: StoreProduct;
  onAskAI?: (prompt: string) => void;
}

export function ProductCard({ product, onAskAI }: ProductCardProps) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants[0] ?? {
      id: "default",
      title: "Standard",
      sku: "DEF",
      priceMinor: product.basePriceMinor,
      inventoryQuantity: 10,
    }
  );
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product, selectedVariant, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border-accent)] hover:shadow-xl hover:shadow-indigo-500/5">
      {/* Top Media & Tags */}
      <div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--bg-surface-elevated)]">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Category Pill */}
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
            {product.category}
          </span>
          {/* Ask AI shortcut button */}
          {onAskAI && (
            <button
              type="button"
              onClick={() => onAskAI(`Tell me about the ${product.name} and what it is best used for.`)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/90 text-white shadow-md backdrop-blur-md transition-transform duration-200 hover:scale-110 active:scale-95"
              title="Ask AI about this product"
            >
              <Sparkles size={14} />
            </button>
          )}
        </div>

        {/* Product Details */}
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-amber-400">
              <Star size={13} fill="currentColor" />
              <span className="font-bold text-[var(--text-primary)]">{product.rating.toFixed(1)}</span>
              <span className="text-[var(--text-muted)]">({product.reviewsCount})</span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-emerald-400">
              {selectedVariant.inventoryQuantity} in stock
            </span>
          </div>

          <h3 className="text-base font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-primary)]">
            {product.name}
          </h3>

          <p className="line-clamp-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Variant Selectors */}
        {product.variants.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariant(v)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                  selectedVariant.id === v.id
                    ? "bg-[var(--accent-primary)] text-white shadow-sm shadow-indigo-500/50"
                    : "border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
                }`}
              >
                {v.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Price & Add Button */}
      <div className="mt-5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Price
          </span>
          <span className="font-mono text-lg font-black text-[var(--text-primary)]">
            {formatPrice(selectedVariant.priceMinor, product.currency)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={added}
          className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
            added
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-500/50 active:scale-95"
          }`}
        >
          {added ? (
            <>
              <Check size={15} />
              <span>Added!</span>
            </>
          ) : (
            <>
              <ShoppingBag size={15} />
              <span>Add to Bag</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
