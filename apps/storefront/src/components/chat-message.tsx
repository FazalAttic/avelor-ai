"use client";

import { motion } from "framer-motion";
import Image from "next/image";
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

export function ChatMessageItem({ message }: { message: UiChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
    >
      {!isUser ? (
        <span className="flex items-center gap-1.5 pl-1 text-[11px] font-medium text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-[image:var(--gradient-brand)]" />
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
        {renderContent(message.content)}
      </div>
      {!isUser && message.products.length > 0 ? (
        <div className="flex max-w-full gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {message.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
