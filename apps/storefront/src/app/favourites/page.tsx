"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { ChatShell } from "@/components/chat-shell";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import { ProductThumb } from "@/components/product-thumb";

type SavedProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string;
};

const INITIAL_ITEMS: SavedProduct[] = [
  {
    id: "volt-runner",
    name: "Volt Runner",
    category: "Running shoes",
    price: "$129",
    image: "/products/volt-runner.png",
  },
  {
    id: "aura-watch",
    name: "Aura Watch",
    category: "Wearables",
    price: "$199",
    image: "/products/aura-watch.png",
  },
  {
    id: "trail-pack",
    name: "Trail Pack",
    category: "Outdoor",
    price: "$59",
    image: "/products/trail-pack.png",
  },
];

export default function FavouritesPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);

  return (
    <ChatShell>
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-end pb-4 sm:pb-6">
        <section className="flex max-h-full w-full max-w-2xl flex-col rounded-[32px] border border-white/50 bg-white/25 p-3 shadow-card backdrop-blur-2xl sm:p-4 dark:border-white/10 dark:bg-white/5">
          <PageHeader
            title="Favourites"
            sub={items.length === 1 ? "1 item" : `${items.length} items`}
          />
          {items.length === 0 ? (
            <p className="pt-2 text-center text-sm text-subtle">
              Nothing saved yet. Tap the heart on any product.
            </p>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-1">
              {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-3 shadow-card sm:gap-4 sm:p-4"
              >
                <ProductThumb src={item.image} alt={item.name} className="size-14 sm:size-16" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  <p className="pt-0.5 text-xs text-subtle">{item.category}</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{item.price}</p>
                <IconButton
                  label={`Remove ${item.name} from favourites`}
                  onClick={() => setItems((current) => current.filter((i) => i.id !== item.id))}
                >
                  <HugeiconsIcon icon={FavouriteIcon} size={20} strokeWidth={1.8} />
                </IconButton>
                <button
                  type="button"
                  className="shrink-0 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background transition-opacity duration-150 ease-expo hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:px-4 sm:text-[13px]"
                >
                  Add <span className="hidden sm:inline">to cart</span>
                </button>
              </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ChatShell>
  );
}
