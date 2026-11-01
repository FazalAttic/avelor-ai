"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export type BotMood = "idle" | "thinking" | "generating";

const MOODS: Record<BotMood, string> = {
  idle: "/bot-idle.gif",
  thinking: "/bot-thinking.gif",
  generating: "/bot-generating.gif",
};

export function BotAvatar({ mood, className }: { mood: BotMood; className?: string }) {
  return (
    <motion.button
      type="button"
      aria-label="Avelor Bot"
      onClick={() => sound.botTap()}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9, y: 3 }}
      transition={{ type: "spring", stiffness: 450, damping: 17 }}
      className={cn(
        "inline-flex shrink-0 cursor-pointer select-none items-center justify-center border-0 bg-transparent p-0 focus:outline-none",
        className
      )}
    >
      <Image
        src={MOODS[mood]}
        alt=""
        width={320}
        height={320}
        aria-hidden
        unoptimized
        priority
        className="pointer-events-none size-6 shrink-0 object-contain dark:invert"
      />
    </motion.button>
  );
}
