"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessageItem, type UiChatMessage } from "@/components/chat-message";
import { ChatShell } from "@/components/chat-shell";
import { Composer } from "@/components/composer";
import { ProductMarquee } from "@/components/product-marquee";
import { ScrollArea } from "@/components/scroll-area";
import type { RecentChat } from "@/components/sidebar";
import { useCart } from "@/lib/cart-context";
import {
  deleteConversation,
  fetchConversation,
  fetchRecentConversations,
  streamChatMessage,
} from "@/lib/chat-api";
import { cn } from "@/lib/utils";

const STARTERS = [
  { emoji: "👟", text: "Running shoes under $100", tilt: "rotate-[1.4deg] translate-y-[2px]" },
  { emoji: "🎮", text: "A gift for a gamer", tilt: "-rotate-[1.8deg] -translate-y-[2.5px]" },
  { emoji: "🧥", text: "Cozy hoodie weather", tilt: "rotate-[1.1deg] translate-y-[1.5px]" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Home() {
  const { addItem, openDrawer } = useCart();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const rafScrollId = useRef<number | null>(null);
  const [showJump, setShowJump] = useState(false);
  const isChatting = sending || messages.length > 0;

  const smoothScrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUpRef.current) return;

    if (rafScrollId.current !== null) return;

    function step() {
      if (!el || userScrolledUpRef.current) {
        rafScrollId.current = null;
        return;
      }

      const target = Math.max(0, el.scrollHeight - el.clientHeight);
      const current = el.scrollTop;
      const diff = target - current;

      if (diff > 0.5) {
        // Organic exponential decay glide (~22% per frame at 60/120fps)
        const stepSize = Math.max(diff * 0.22, 1);
        el.scrollTop = Math.min(target, current + stepSize);
        rafScrollId.current = requestAnimationFrame(step);
      } else {
        el.scrollTop = target;
        rafScrollId.current = null;
      }
    }

    rafScrollId.current = requestAnimationFrame(step);
  }, []);

  async function loadRecents() {
    try {
      const recents = await fetchRecentConversations();
      setRecentChats(recents.map((r) => ({ id: r.id, title: r.title })));
    } catch {
      // Ignore network errors when fetching recents
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load recents once on mount
  useEffect(() => {
    loadRecents();
  }, []);

  async function handleSelectChat(id: string) {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    userScrolledUpRef.current = false;
    setShowJump(false);
    try {
      const details = await fetchConversation(id);
      if (details) {
        setMessages(
          details.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            products: m.products ?? [],
          }))
        );
        requestAnimationFrame(() => smoothScrollToBottom());
      }
    } catch {
      // Ignore retrieval errors
    }
  }

  function handleNewChat() {
    setActiveConversationId(null);
    userScrolledUpRef.current = false;
    setShowJump(false);
    setMessages([]);
    setPrompt("");
    inputRef.current?.focus();
  }

  async function handleDeleteChat(id: string) {
    try {
      await deleteConversation(id);
      setRecentChats((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch {
      // Ignore deletion errors
    }
  }

  // Detect manual user scrolling to pause auto-follow when reading earlier history
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    function onWheel(e: WheelEvent) {
      if (!node) return;
      if (e.deltaY < 0) {
        // User scrolled UP
        userScrolledUpRef.current = true;
        setShowJump(true);
      } else if (e.deltaY > 0) {
        // User scrolled DOWN - check if near bottom
        const gap = node.scrollHeight - node.clientHeight - (node.scrollTop + e.deltaY);
        if (gap <= 40) {
          userScrolledUpRef.current = false;
          setShowJump(false);
        }
      }
    }

    let touchStartY = 0;
    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0]?.clientY ?? 0;
    }
    function onTouchMove(e: TouchEvent) {
      if (!node) return;
      const currentY = e.touches[0]?.clientY ?? 0;
      if (currentY > touchStartY + 10) {
        // User swiped down to view earlier messages
        userScrolledUpRef.current = true;
        setShowJump(true);
      } else if (currentY < touchStartY - 10) {
        // User swiped up towards bottom
        const gap = node.scrollHeight - node.clientHeight - node.scrollTop;
        if (gap <= 40) {
          userScrolledUpRef.current = false;
          setShowJump(false);
        }
      }
    }

    node.addEventListener("wheel", onWheel, { passive: true });
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // Keep pinned to the bottom smoothly as the thread grows during token streaming
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;

    const observer = new ResizeObserver(() => {
      if (!userScrolledUpRef.current) {
        smoothScrollToBottom();
      }
    });

    observer.observe(thread);
    return () => {
      observer.disconnect();
      if (rafScrollId.current !== null) {
        cancelAnimationFrame(rafScrollId.current);
        rafScrollId.current = null;
      }
    };
  }, [smoothScrollToBottom]);

  function trackPinned() {
    const el = scrollRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
    if (gap <= 40) {
      userScrolledUpRef.current = false;
      setShowJump(false);
    } else if (gap > 160 && userScrolledUpRef.current) {
      setShowJump(true);
    }
  }

  function jumpToLatest() {
    userScrolledUpRef.current = false;
    setShowJump(false);
    smoothScrollToBottom();
  }

  useEffect(() => {
    if (!isChatting) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isChatting]);

  async function handleSubmit(text: string) {
    if (sending) return;
    const userMsgId = crypto.randomUUID();
    const replyId = crypto.randomUUID();

    // Reset user scroll state on new message submission
    userScrolledUpRef.current = false;
    setShowJump(false);

    // Immediately add both user message and assistant placeholder (with pulsing dots)
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: text, products: [] },
      { id: replyId, role: "assistant", content: "", products: [], isStreaming: true },
    ]);
    setSending(true);
    smoothScrollToBottom();

    try {
      const history = messages.map(({ role, content }) => ({ role, content }));
      let accumulated = "";

      await streamChatMessage(text, history, activeConversationId, {
        onMeta: (meta) => {
          if (meta.conversationId) setActiveConversationId(meta.conversationId);
        },
        onDelta: (delta) => {
          accumulated += delta;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId ? { ...m, content: accumulated, isStreaming: true } : m
            )
          );
          if (!userScrolledUpRef.current) {
            smoothScrollToBottom();
          }
        },
        onDone: (data) => {
          if (data.conversationId) setActiveConversationId(data.conversationId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId
                ? {
                    ...m,
                    content: data.reply || accumulated,
                    products: data.products,
                    isStreaming: false,
                  }
                : m
            )
          );
          if (!userScrolledUpRef.current) {
            smoothScrollToBottom();
          }
          loadRecents();
        },
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyId
            ? {
                ...m,
                content: "Something went wrong on my end. Give it another try?",
                products: [],
                isStreaming: false,
                isError: true,
              }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <ChatShell
      recentChats={recentChats}
      activeChatId={activeConversationId}
      onSelectChat={handleSelectChat}
      onNewChat={handleNewChat}
      onDeleteChat={handleDeleteChat}
    >
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
            className="flex w-full max-w-3xl translate-y-16 flex-col items-center gap-10 px-6 sm:px-8 md:translate-y-14"
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
              <div
                ref={threadRef}
                className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 pt-24 pb-56 sm:px-8"
              >
                {messages.map((message) => (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    onBuyNow={(product) => {
                      addItem(product);
                      openDrawer();
                    }}
                    onAddToCart={addItem}
                  />
                ))}
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
