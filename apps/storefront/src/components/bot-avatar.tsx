"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export type BotMood = "idle" | "thinking" | "generating";

const MOODS: Record<BotMood, string> = {
  idle: "/bot-idle.gif",
  thinking: "/bot-thinking.gif",
  generating: "/bot-generating.gif",
};

export function BotAvatar({ mood, className }: { mood: BotMood; className?: string }) {
  return (
    <Image
      src={MOODS[mood]}
      alt=""
      width={320}
      height={320}
      aria-hidden
      unoptimized
      priority
      className={cn("size-6 shrink-0 object-contain dark:invert", className)}
    />
  );
}
