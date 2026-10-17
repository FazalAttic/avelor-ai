"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ChatMessageItem, type UiChatMessage } from "@/components/chat-message";
import { ChatShell } from "@/components/chat-shell";
import { Composer } from "@/components/composer";
import { ProductMarquee } from "@/components/product-marquee";
import { ScrollArea } from "@/components/scroll-area";
import { sendChatMessage } from "@/lib/chat-api";
import { cn } from "@/lib/utils";

const STARTERS = [
  { emoji: "👟", text: "Running shoes under $100", tilt: "rotate-[1.4deg] translate-y-[2px]" },
  { emoji: "🎮", text: "A gift for a gamer", tilt: "-rotate-[1.8deg] -translate-y-[2.5px]" },
  { emoji: "🧥", text: "Cozy hoodie weather", tilt: "rotate-[1.1deg] translate-y-[1.5px]" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="flex items-center gap-1.5 rounded-[22px] rounded-bl-lg border border-white/50 bg-white/40 px-4 py-3.5 backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
    >
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          aria-hidden
          className="size-1.5 rounded-full bg-muted"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
        />
      ))}
      <span className="sr-only">Avelor is thinking</span>
    </motion.div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const isChatting = sending || messages.length > 0;

  // Follow the thread only while the reader is already at the bottom, so a new
  // reply never yanks them out of something they were re-reading.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-check on every message and phase change
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function trackPinned() {
    const el = scrollRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
    pinnedRef.current = gap < 160;
    setShowJump(gap > 160);
  }

  function jumpToLatest() {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = true;
    setShowJump(false);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  useEffect(() => {
    if (!isChatting) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isChatting]);

  async function handleSubmit(text: string) {
    if (sending) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text, products: [] },
    ]);
    setSending(true);
    try {
      const history = messages.map(({ role, content }) => ({ role, content }));
      const result = await sendChatMessage(text, history);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply,
          products: result.products,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Something went wrong on my end. Give it another try?",
          products: [],
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <ChatShell>
      <AnimatePresence initial={false}>
        {!isChatting ? (
          <motion.div
            key="marquee"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-0 z-10"
          >
            <ProductMarquee />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false} mode="popLayout">
        {!isChatting ? (
          <motion.div
            key="hero"
            exit={{ opacity: 0, y: -40, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: EASE }}
            className="flex w-full max-w-3xl translate-y-10 flex-col items-center gap-10 px-6 sm:px-8 md:translate-y-14"
          >
            <h1 className="text-center text-3xl font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Find your{" "}
              <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">
                perfect pair
              </span>{" "}
              of shoes
            </h1>
            <motion.div
              layoutId="chat-dock"
              transition={{ layout: { duration: 0.45, ease: EASE } }}
              className="w-full rounded-[32px] border border-white/50 bg-white/25 p-3 shadow-card backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
            >
              <Composer
                placeholder="What are you looking for?"
                value={prompt}
                onValueChange={setPrompt}
                inputRef={inputRef}
                onSubmit={handleSubmit}
              />
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3 pb-1">
                {STARTERS.map((starter) => (
                  <button
                    key={starter.text}
                    type="button"
                    onClick={() => {
                      setPrompt(starter.text);
                      inputRef.current?.focus();
                    }}
                    className={
                      "inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-medium text-foreground shadow-card backdrop-blur-xl " +
                      `${starter.tilt} ` +
                      "transition-all duration-200 ease-expo hover:rotate-0 hover:translate-y-0 hover:scale-105 hover:bg-white/80 hover:shadow-pop active:scale-95 sm:px-3.5 sm:text-[13px] " +
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue " +
                      "dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
                    }
                  >
                    <span className="text-sm leading-none">{starter.emoji}</span>
                    <span>{starter.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="thread"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative z-10 flex h-full min-h-0 w-full flex-col"
          >
            <ScrollArea onScroll={trackPinned} className="min-h-0 flex-1" viewportRef={scrollRef}>
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 pt-24 pb-56 sm:px-8">
                {messages.map((message) => (
                  <ChatMessageItem key={message.id} message={message} />
                ))}
                {sending ? <ThinkingIndicator /> : null}
              </div>
            </ScrollArea>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-6 pb-5 sm:px-8 sm:pb-6">
              <AnimatePresence initial={false}>
                {showJump ? (
                  <motion.button
                    key="jump"
                    type="button"
                    aria-label="Go to the latest message"
                    onClick={jumpToLatest}
                    initial={{ opacity: 0, y: 14, scale: 0.55 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 14, scale: 0.55 }}
                    transition={{ type: "spring", stiffness: 480, damping: 28 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "pointer-events-auto mb-3 flex size-10 items-center justify-center rounded-full",
                      "border border-foreground/10 bg-white/85 text-foreground shadow-pop backdrop-blur-xl",
                      "transition-colors duration-200 ease-expo hover:bg-white",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
                      "dark:border-white/15 dark:bg-[#15182b]/85 dark:hover:bg-[#1c2036]"
                    )}
                  >
                    <motion.span
                      aria-hidden
                      animate={{ y: [0, 3, 0] }}
                      transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <HugeiconsIcon icon={ArrowDown01Icon} size={20} strokeWidth={2.2} />
                    </motion.span>
                  </motion.button>
                ) : null}
              </AnimatePresence>
              <motion.div
                layoutId="chat-dock"
                transition={{ layout: { duration: 0.45, ease: EASE } }}
                className="pointer-events-auto mx-auto w-full max-w-3xl rounded-[32px] border border-white/50 bg-white/25 p-3 shadow-card backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
              >
                <Composer
                  placeholder="Ask a follow-up…"
                  value={prompt}
                  onValueChange={setPrompt}
                  inputRef={inputRef}
                  onSubmit={handleSubmit}
                  disabled={sending}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {!isChatting ? (
          <motion.div
            key="trust"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-3 px-6 text-[11px] font-medium text-muted sm:gap-5 sm:px-8 sm:text-xs"
          >
            <span className="whitespace-nowrap">Free 30-day returns</span>
            <span aria-hidden className="size-1 rounded-full bg-border-strong" />
            <span className="hidden whitespace-nowrap min-[420px]:block">
              Free shipping over $75
            </span>
            <span
              aria-hidden
              className="hidden size-1 rounded-full bg-border-strong min-[420px]:block"
            />
            <span className="whitespace-nowrap">Secure checkout</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ChatShell>
  );
}
