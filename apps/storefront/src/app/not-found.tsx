"use client";

import { ArrowLeft01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChatShell } from "@/components/chat-shell";
import { sound } from "@/lib/sound";

export default function NotFound() {
  const [tapCount, setTapCount] = useState(0);

  function handleBotClick() {
    sound.botTap();
    setTapCount((prev) => prev + 1);
  }

  return (
    <ChatShell>
      {/* Soft atmospheric white gradient shade on the bottom */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-64 bg-gradient-to-t from-white via-white/80 to-transparent sm:h-80 dark:from-[#0a0c18] dark:via-[#0a0c18]/80 dark:to-transparent"
      />

      <div className="relative z-10 flex min-h-full w-full flex-col items-center justify-center px-6 py-12 text-center sm:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full max-w-3xl flex-col items-center"
        >
          {/* Giant 4 🤖 4 with white gradient shades on the bottom */}
          <div className="flex select-none items-center justify-center gap-2 sm:gap-4 md:gap-6">
            <span className="font-numbers text-8xl font-black leading-none tracking-tighter bg-gradient-to-b from-foreground via-foreground/50 to-transparent bg-clip-text text-transparent sm:text-9xl md:text-[13rem] lg:text-[16rem] dark:from-white dark:via-white/50 dark:to-transparent">
              4
            </span>

            <motion.button
              type="button"
              onClick={handleBotClick}
              whileHover={{ scale: 1.08, rotate: [0, -6, 6, 0] }}
              whileTap={{ scale: 0.9 }}
              title="Poke the lost bot"
              className="group relative flex size-24 items-center justify-center rounded-[32px] border border-white/60 bg-white/50 shadow-pop backdrop-blur-2xl transition-transform sm:size-32 sm:rounded-[40px] md:size-40 dark:border-white/15 dark:bg-white/10"
            >
              <Image
                src="/bot-thinking.gif"
                alt="Confused Avelor Bot"
                width={320}
                height={320}
                unoptimized
                priority
                className="size-16 object-contain transition-transform group-hover:scale-105 sm:size-22 md:size-28 dark:invert"
              />
              <span className="absolute -bottom-2 -right-2 flex size-7 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white shadow-xs sm:size-8 sm:text-sm">
                ?
              </span>
            </motion.button>

            <span className="font-numbers text-8xl font-black leading-none tracking-tighter bg-gradient-to-b from-foreground via-foreground/50 to-transparent bg-clip-text text-transparent sm:text-9xl md:text-[13rem] lg:text-[16rem] dark:from-white dark:via-white/50 dark:to-transparent">
              4
            </span>
          </div>

          {/* Title and subtitle */}
          <h1 className="pt-6 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            Whoops! Lost in the Cloud.
          </h1>

          <p className="max-w-md pt-2.5 text-sm leading-relaxed text-muted sm:text-base">
            We searched high and low, but this page seems to have wandered off our cloud store.
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              onClick={() => sound.pop()}
              className="btn-brand inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold shadow-card transition-transform active:scale-95"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} />
              Take me back home
            </Link>

            <Link
              href="/orders"
              onClick={() => sound.click()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/60 bg-white/50 px-6 text-sm font-semibold text-foreground shadow-card backdrop-blur-xl transition-all hover:bg-white/80 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <HugeiconsIcon icon={ShoppingBag01Icon} size={18} strokeWidth={1.8} />
              View orders
            </Link>
          </div>

          {tapCount > 2 && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pt-4 text-xs font-medium text-brand-blue dark:text-cyan-300"
            >
              Hey! Stop poking the bot, it&apos;s already having an identity crisis! 😂
            </motion.p>
          )}
        </motion.div>
      </div>
    </ChatShell>
  );
}
