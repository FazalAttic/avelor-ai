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
import { BotAvatar, type BotMood } from "@/components/bot-avatar";
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

function stripTechnicalIds(text: string): string {
  if (!text) return "";
  return text
    .replace(/\s*\([iI][dD]:\s*`?[a-zA-Z0-9_.-]+`?\)/g, "")
    .replace(/\s*\[[iI][dD]:\s*`?[a-zA-Z0-9_.-]+`?\]/g, "")
    .replace(/\s*\(`?prod_[a-zA-Z0-9_.-]+`?\)/g, "")
    .replace(/\s*\[`?prod_[a-zA-Z0-9_.-]+`?\]/g, "")
    .replace(/\s*`prod_[a-zA-Z0-9_.-]+`/g, "")
    .replace(/ +([.,!?;:])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

function renderContent(content: string) {
  // Gemini answers in light markdown; keep it clean and dependency-free.
  const cleaned = stripTechnicalIds(content);
  const normalized = cleaned.replace(/^[ \t]*[*-][ \t]+/gm, "• ");
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

function renderStreamingBlurContent(content: string) {
  const cleaned = stripTechnicalIds(content);
  const normalized = cleaned.replace(/^[ \t]*[*-][ \t]+/gm, "• ");
  const parts = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  let wordIndex = 0;
  const elements: React.ReactNode[] = [];

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      const inner = part.slice(2, -2);
      const tokens = inner.split(/(\s+)/);
      for (const token of tokens) {
        if (/^\s+$/.test(token)) {
          elements.push(token);
        } else if (token) {
          const key = `w-${wordIndex++}`;
          elements.push(
            <motion.strong
              key={key}
              initial={{ opacity: 0, filter: "blur(6px)", y: 2 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block font-semibold will-change-[filter,opacity]"
            >
              {token}
            </motion.strong>
          );
        }
      }
    } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      const inner = part.slice(1, -1);
      const key = `w-${wordIndex++}`;
      elements.push(
        <motion.span
          key={key}
          initial={{ opacity: 0, filter: "blur(6px)", y: 2 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block rounded-md bg-foreground/5 px-1.5 py-px font-mono text-[13px] text-muted will-change-[filter,opacity]"
        >
          {inner}
        </motion.span>
      );
    } else if (part) {
      const tokens = part.split(/(\s+)/);
      for (const token of tokens) {
        if (/^\s+$/.test(token)) {
          elements.push(token);
        } else if (token) {
          const key = `w-${wordIndex++}`;
          elements.push(
            <motion.span
              key={key}
              initial={{ opacity: 0, filter: "blur(6px)", y: 2 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block will-change-[filter,opacity]"
            >
              {token}
            </motion.span>
          );
        }
      }
    }
  }

  return elements;
}

function getProductMerchant(product: ChatProduct): string {
  const name = product.name.toLowerCase();
  if (name.includes("nike")) return "Nike";
  if (name.includes("apple") || name.includes("airpod")) return "Apple";
  if (name.includes("adidas")) return "Adidas";
  if (name.includes("layasa")) return "Layasa";
  if (product.categories && product.categories.length > 0) {
    const cat = product.categories[0];
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
  return "Avelor Store";
}

function getProductDiscount(product: ChatProduct): {
  originalPrice: { amount: number; currency: string } | null;
  discountPercent: number | null;
} {
  const price = product.variants[0]?.price;
  if (!price) return { originalPrice: null, discountPercent: null };

  const name = product.name.toLowerCase();
  let originalAmount: number | null = null;

  if (name.includes("air force") && price.amount < 11000) {
    originalAmount = 11500; // Nike Air Force 1 MSRP $115.00
  } else if (name.includes("aero glide")) {
    originalAmount = 16000;
  } else if (name.includes("layasa")) {
    originalAmount = 12500;
  } else if (name.includes("leather boots") || name.includes("admin")) {
    originalAmount = 22000;
  } else if (name.includes("daypack") || name.includes("nomad")) {
    originalAmount = 12000;
  } else if (name.includes("merino") || name.includes("thermal")) {
    originalAmount = 7500;
  }

  if (originalAmount && originalAmount > price.amount) {
    const discount = Math.round(((originalAmount - price.amount) / originalAmount) * 100);
    return {
      originalPrice: { amount: originalAmount, currency: price.currency },
      discountPercent: discount,
    };
  }

  return { originalPrice: null, discountPercent: null };
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
  const { originalPrice, discountPercent } = getProductDiscount(product);
  const merchant = getProductMerchant(product);
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
      draggable={false}
      className={cn(
        "group relative flex w-64 sm:w-72 shrink-0 snap-start select-none flex-col overflow-hidden rounded-[26px]",
        "border border-white/60 bg-white/50 p-3 shadow-card backdrop-blur-xl",
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-pop",
        "dark:border-white/10 dark:bg-white/10"
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center p-3 select-none pointer-events-none">
        {product.media[0] ? (
          <Image
            src={product.media[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 256px, 288px"
            unoptimized
            draggable={false}
            className="pointer-events-none select-none object-contain p-2.5 transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {onAddToCart ? (
          <button
            type="button"
            onClick={handleAdd}
            title={justAdded ? "Added to bag" : "Add to bag"}
            className={cn(
              "pointer-events-auto absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full border transition-all duration-150 active:scale-95",
              justAdded
                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                : "bg-white/90 dark:bg-black/70 border-black/5 dark:border-white/10 text-foreground shadow-xs hover:scale-110 hover:bg-white dark:hover:bg-black/90"
            )}
          >
            <HugeiconsIcon
              icon={justAdded ? CheckmarkBadge01Icon : PlusSignIcon}
              size={15}
              strokeWidth={2.2}
              className={justAdded ? "text-white" : ""}
            />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-1 pt-3">
        <div>
          <h3
            className="line-clamp-2 text-sm font-semibold leading-snug text-foreground min-h-[2.5rem]"
            title={product.name}
          >
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            {price ? (
              <span className="text-lg font-bold tracking-tight text-foreground">
                <TextMorph as="span">{formatPrice(price)}</TextMorph>
              </span>
            ) : null}
            {originalPrice ? (
              <span className="text-xs text-muted line-through">
                <TextMorph as="span">{formatPrice(originalPrice)}</TextMorph>
              </span>
            ) : null}
            {discountPercent ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {discountPercent}% off
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <span className="size-2 rounded-full bg-brand-blue shrink-0" />
            <span className="truncate">{merchant}</span>
          </div>
        </div>
        <div>
          {onBuyNow ? (
            <button
              type="button"
              onClick={() => onBuyNow(product)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border/80 bg-white/80 text-[13px] font-semibold text-foreground shadow-xs transition-all duration-150 hover:bg-white hover:shadow-card active:scale-[0.98] dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <HugeiconsIcon icon={ShoppingBag01Icon} size={15} strokeWidth={2} />
              <span>Buy now</span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const EDGE_FADE = 48;

const ARROW_CLASS = cn(
  "flex size-10 items-center justify-center rounded-full border border-border/80 bg-surface/90 text-foreground shadow-pop backdrop-blur-xl",
  "transition-all duration-150 ease-expo hover:bg-surface hover:scale-105 active:scale-95",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
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

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const didDragRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a")) return;

    const el = rowRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    didDragRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = rowRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 4) {
      didDragRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      rowRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.stopPropagation();
      e.preventDefault();
      didDragRef.current = false;
    }
  };

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
    const el = rowRef.current;
    if (!el) return;
    const cardEl = el.firstElementChild as HTMLElement | null;
    const stride = cardEl ? cardEl.offsetWidth + 16 : 288;
    el.scrollBy({ left: direction * stride, behavior: "smooth" });
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
      <section
        ref={rowRef}
        aria-label="Recommended products"
        style={{ WebkitMaskImage: edgeMask, maskImage: edgeMask }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={handleClickCapture}
        className="flex gap-4 overflow-x-auto py-2 px-1 snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onBuyNow={onBuyNow}
            onAddToCart={onAddToCart}
          />
        ))}
      </section>
      <AnimatePresence initial={false}>
        {overflow.left ? (
          <motion.div
            key="left"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20"
          >
            <button
              type="button"
              aria-label="Scroll to previous products"
              onClick={() => scroll(-1)}
              className={ARROW_CLASS}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.2} />
            </button>
          </motion.div>
        ) : null}
        {overflow.right ? (
          <motion.div
            key="right"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20"
          >
            <button
              type="button"
              aria-label="Scroll to more products"
              onClick={() => scroll(1)}
              className={ARROW_CLASS}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2.2} />
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
  const botMood: BotMood = !message.content
    ? "thinking"
    : message.isStreaming
      ? "generating"
      : "idle";

  return (
    <motion.div
      initial={
        isUser
          ? { opacity: 0, y: 24, x: 12, scale: 0.88, filter: "blur(6px)" }
          : { opacity: 0, y: 6, filter: "blur(4px)" }
      }
      animate={{ opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" }}
      transition={
        isUser
          ? {
              type: "spring",
              stiffness: 440,
              damping: 26,
              mass: 0.8,
            }
          : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
      }
      style={isUser ? { transformOrigin: "bottom right" } : undefined}
      className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}
    >
      {!isUser ? (
        <span className="flex items-center gap-2 pl-1 text-[11px] font-medium text-muted">
          <BotAvatar mood={botMood} />
          Avelor
        </span>
      ) : (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="pr-1 text-[11px] font-medium text-muted"
        >
          You
        </motion.span>
      )}
      <motion.div
        whileHover={isUser ? { scale: 1.01 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "max-w-[85%] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap sm:max-w-[75%]",
          isUser
            ? "rounded-[22px] rounded-br-lg bg-foreground text-background shadow-xs"
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
        ) : !isUser && message.isStreaming ? (
          renderStreamingBlurContent(message.content)
        ) : (
          renderContent(message.content)
        )}
      </motion.div>
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
