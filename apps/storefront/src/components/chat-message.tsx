"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  PlusSignIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { TextMorph } from "torph/react";
import { BotAvatar } from "@/components/bot-avatar";
import { type ChatProduct, formatPrice } from "@/lib/chat-api";
import { cn } from "@/lib/utils";

export type UiChatMessage = {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly products: readonly ChatProduct[];
  readonly isError?: boolean;
  readonly isStreaming?: boolean;
};

function renderContent(content: string) {
  // Gemini answers in light markdown; keep it dependency-free.
  const normalized = content.replace(/^[ \t]*[*-][ \t]+/gm, "• ");
  const parts = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  let cursor = 0;
  return parts.map((part) => {
    const key = `${cursor}-${part.length}`;
    cursor += part.length;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <span
          key={key}
          className="rounded-md bg-foreground/5 px-1.5 py-px font-mono text-[13px] text-muted"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

function ProductCard({
  product,
  onBuyNow,
  onAddToCart,
}: {
  product: ChatProduct;
  onBuyNow?: (product: ChatProduct) => void;
  onAddToCart?: (product: ChatProduct) => void;
}) {
  const price = product.variants[0]?.price ?? null;
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    if (onAddToCart) {
      onAddToCart(product);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    }
  }

  return (
    <article
      className={cn(
        "group relative flex w-44 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/40 shadow-card backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop",
        "dark:border-white/10 dark:bg-white/10"
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-brand-wash">
        {product.media[0] ? (
          <Image
            src={product.media[0]}
            alt={product.name}
            fill
            sizes="176px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <p className="truncate text-[13px] font-semibold text-foreground">{product.name}</p>
          {price ? (
            <p className="mt-0.5 text-xs text-muted">
              <TextMorph as="span">{formatPrice(price)}</TextMorph>
            </p>
          ) : null}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          {onBuyNow ? (
            <button
              type="button"
              onClick={() => onBuyNow(product)}
              className="flex h-8 flex-1 items-center justify-center gap-1 rounded-xl bg-foreground text-[12px] font-medium text-background shadow-xs transition-all duration-150 hover:bg-foreground/85 active:scale-[0.97]"
            >
              <HugeiconsIcon icon={ShoppingBag01Icon} size={13} strokeWidth={2.2} />
              Buy now
            </button>
          ) : null}
          {onAddToCart ? (
            <button
              type="button"
              onClick={handleAdd}
              title={justAdded ? "Added to bag" : "Add to bag"}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition-all duration-150 active:scale-95",
                justAdded
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-surface hover:bg-surface-hover"
              )}
            >
              <HugeiconsIcon
                icon={justAdded ? CheckmarkBadge01Icon : PlusSignIcon}
                size={14}
                strokeWidth={2.2}
              />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const CARD_STRIDE = 188; // w-44 card + gap-3
const EDGE_FADE = 40;

const ARROW_CLASS = cn(
  "flex size-8 items-center justify-center rounded-full border border-white/50 bg-white/70 text-foreground shadow-card backdrop-blur-xl",
  "transition-all duration-150 ease-expo hover:bg-white hover:shadow-pop active:scale-95",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
  "dark:border-white/15 dark:bg-[#15182b]/70 dark:hover:bg-[#15182b]"
);

function ProductCarousel({
  products,
  onBuyNow,
  onAddToCart,
}: {
  products: readonly ChatProduct[];
  onBuyNow?: (product: ChatProduct) => void;
  onAddToCart?: (product: ChatProduct) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the row's products change
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    function measure() {
      const node = rowRef.current;
      if (!node) return;
      const remaining = node.scrollWidth - node.clientWidth - node.scrollLeft;
      setOverflow({ left: node.scrollLeft > 4, right: remaining > 4 });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    measure();
    const frame = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [products.length]);

  function scroll(direction: 1 | -1) {
    rowRef.current?.scrollBy({ left: direction * CARD_STRIDE, behavior: "smooth" });
  }

  // Cards dissolve where the row keeps going instead of ending on a hard edge.
  const stops = [
    overflow.left ? "transparent 0" : "black 0",
    overflow.left ? `black ${EDGE_FADE}px` : null,
    overflow.right ? `black calc(100% - ${EDGE_FADE}px)` : null,
    overflow.right ? "transparent 100%" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const edgeMask = overflow.left || overflow.right ? `linear-gradient(to right, ${stops})` : "none";

  return (
    <div className="relative w-full">
      <div
        ref={rowRef}
        style={{ WebkitMaskImage: edgeMask, maskImage: edgeMask }}
        className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onBuyNow={onBuyNow}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
      <AnimatePresence initial={false}>
        {overflow.left ? (
          <motion.div
            key="left"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-2 top-[72px] z-10"
          >
            <button
              type="button"
              aria-label="Scroll to previous products"
              onClick={() => scroll(-1)}
              className={ARROW_CLASS}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} />
            </button>
          </motion.div>
        ) : null}
        {overflow.right ? (
          <motion.div
            key="right"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-2 top-[72px] z-10"
          >
            <button
              type="button"
              aria-label="Scroll to more products"
              onClick={() => scroll(1)}
              className={ARROW_CLASS}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ChatMessageItem({
  message,
  onBuyNow,
  onAddToCart,
}: {
  message: UiChatMessage;
  reveal?: boolean;
  onBuyNow?: (product: ChatProduct) => void;
  onAddToCart?: (product: ChatProduct) => void;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: isUser ? 8 : 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
    >
      {!isUser ? (
        <span className="flex items-center gap-2 pl-1 text-[11px] font-medium text-muted">
          <BotAvatar mood={message.isStreaming ? "generating" : "idle"} />
          Avelor
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[85%] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap sm:max-w-[75%]",
          isUser
            ? "rounded-[22px] rounded-br-lg bg-foreground text-background"
            : "rounded-[22px] rounded-bl-lg border border-white/50 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/10",
          message.isError === true &&
            "border-red-300/60 bg-red-50/70 text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200"
        )}
      >
        {!isUser && !message.content ? (
          <span className="flex items-center gap-1.5 py-1">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                aria-hidden
                className="size-1.5 rounded-full bg-muted"
                animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: dot * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
            <span className="sr-only">is thinking</span>
          </span>
        ) : (
          <>
            {renderContent(message.content)}
            {message.isStreaming ? (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-brand-blue align-middle"
              />
            ) : null}
          </>
        )}
      </div>
      {!isUser && message.products.length > 0 ? (
        <ProductCarousel
          products={message.products}
          onBuyNow={onBuyNow}
          onAddToCart={onAddToCart}
        />
      ) : null}
    </motion.div>
  );
}
