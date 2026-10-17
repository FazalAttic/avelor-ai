"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BotAvatar } from "@/components/bot-avatar";
import { type ChatProduct, formatPrice } from "@/lib/chat-api";
import { cn } from "@/lib/utils";

export type UiChatMessage = {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly products: readonly ChatProduct[];
  readonly isError?: boolean;
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

function ProductCard({ product }: { product: ChatProduct }) {
  const price = product.variants[0]?.price ?? null;
  return (
    <article
      className={cn(
        "w-44 shrink-0 overflow-hidden rounded-2xl border border-white/50 bg-white/40 shadow-card backdrop-blur-xl",
        "dark:border-white/10 dark:bg-white/10"
      )}
    >
      <div className="relative aspect-square bg-brand-wash">
        {product.media[0] ? (
          <Image
            src={product.media[0]}
            alt={product.name}
            fill
            sizes="176px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="p-3">
        <p className="truncate text-[13px] font-semibold text-foreground">{product.name}</p>
        {price ? <p className="mt-0.5 text-xs text-muted">{formatPrice(price)}</p> : null}
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

function ProductCarousel({ products }: { products: readonly ChatProduct[] }) {
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
          <ProductCard key={product.id} product={product} />
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

const REVEAL_MS = 16;
const REVEAL_CHARS = 4;

export function ChatMessageItem({
  message,
  reveal = false,
}: {
  message: UiChatMessage;
  reveal?: boolean;
}) {
  const isUser = message.role === "user";
  const reveals = reveal && !isUser;
  // Seed empty on the first paint, otherwise the whole answer flashes before the
  // reveal effect gets a chance to hide it.
  const [typed, setTyped] = useState(reveals ? "" : message.content);
  const [writing, setWriting] = useState(reveals);

  // The API answers in one JSON body, so the reply is written out here — that
  // is what gives the bot something to look like it is generating.
  useEffect(() => {
    if (!reveals) {
      setTyped(message.content);
      setWriting(false);
      return;
    }
    setTyped("");
    setWriting(true);
    const text = message.content;
    let shown = 0;
    const timer = window.setInterval(() => {
      shown = Math.min(text.length, shown + REVEAL_CHARS);
      setTyped(text.slice(0, shown));
      if (shown >= text.length) {
        window.clearInterval(timer);
        setWriting(false);
      }
    }, REVEAL_MS);
    return () => window.clearInterval(timer);
  }, [reveals, message.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
    >
      {!isUser ? (
        <span className="flex items-center gap-2 pl-1 text-[11px] font-medium text-muted">
          <BotAvatar mood={writing ? "generating" : "idle"} />
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
        {renderContent(isUser ? message.content : typed)}
        {writing ? (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-muted align-middle"
          />
        ) : null}
      </div>
      {!isUser && !writing && message.products.length > 0 ? (
        <ProductCarousel products={message.products} />
      ) : null}
    </motion.div>
  );
}
