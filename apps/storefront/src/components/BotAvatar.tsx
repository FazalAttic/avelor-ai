"use client";

import React from "react";

export type BotState = "idle" | "thinking" | "generating";

interface BotAvatarProps {
  state?: BotState;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

const BOT_GIF_MAP: Record<
  BotState,
  {
    src: string;
    alt: string;
    label: string;
    badgeColor: string;
    ringColor: string;
    textColor: string;
    glowClass: string;
    borderGradient: string;
  }
> = {
  idle: {
    src: "/bot-idle.gif",
    alt: "Avelor Assistant Idle",
    label: "Ready to assist",
    badgeColor: "bg-emerald-400",
    ringColor: "ring-emerald-400/40",
    textColor: "text-emerald-600 dark:text-emerald-400",
    glowClass: "shadow-sm hover:shadow-indigo-500/20",
    borderGradient: "bg-gradient-to-tr from-indigo-500/40 via-purple-500/20 to-emerald-500/40",
  },
  thinking: {
    src: "/bot-thinking.gif",
    alt: "Avelor Assistant Thinking",
    label: "Evaluating Guardrails...",
    badgeColor: "bg-amber-400",
    ringColor: "ring-amber-400/60",
    textColor: "text-amber-600 dark:text-amber-400",
    glowClass: "shadow-lg shadow-amber-500/30",
    borderGradient: "bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500",
  },
  generating: {
    src: "/bot-generating.gif",
    alt: "Avelor Assistant Generating Text",
    label: "Responding...",
    badgeColor: "bg-indigo-400",
    ringColor: "ring-indigo-400/60",
    textColor: "text-indigo-600 dark:text-indigo-400",
    glowClass: "shadow-lg shadow-indigo-500/40",
    borderGradient: "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500",
  },
};

const SIZE_CONFIG = {
  sm: {
    box: "w-9 h-9",
    imgSize: 36,
    badge: "w-2.5 h-2.5",
    labelTitle: "text-xs",
    labelSub: "text-[10px]",
  },
  md: {
    box: "w-12 h-12",
    imgSize: 48,
    badge: "w-3 h-3",
    labelTitle: "text-sm",
    labelSub: "text-xs",
  },
  lg: {
    box: "w-20 h-20",
    imgSize: 80,
    badge: "w-4 h-4",
    labelTitle: "text-base",
    labelSub: "text-xs",
  },
  xl: {
    box: "w-28 h-28",
    imgSize: 112,
    badge: "w-5 h-5",
    labelTitle: "text-lg",
    labelSub: "text-sm",
  },
};

export function BotAvatar({
  state = "idle",
  size = "md",
  showLabel = false,
  className = "",
  onClick,
}: BotAvatarProps) {
  const current = BOT_GIF_MAP[state] ?? BOT_GIF_MAP.idle;
  const cfg = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none transition-transform duration-200 ${
        onClick ? "cursor-pointer hover:scale-[1.03]" : ""
      } ${className}`}
    >
      <div
        className={`relative ${cfg.box} rounded-full p-[2px] transition-all duration-300 ${current.borderGradient} ${current.glowClass}`}
      >
        {/* Animated radar ring when thinking or generating */}
        {state !== "idle" && (
          <span
            className={`pointer-events-none absolute -inset-1 rounded-full border-2 animate-ping opacity-35 ${
              state === "thinking" ? "border-amber-400" : "border-indigo-400"
            }`}
          />
        )}

        {/* Inner GIF avatar container */}
        <div className="relative h-full w-full overflow-hidden rounded-full bg-slate-900">
          <img
            src={current.src}
            alt={current.alt}
            width={cfg.imgSize}
            height={cfg.imgSize}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Dynamic status pip indicator */}
        <span
          className={`absolute bottom-0 right-0 ${cfg.badge} rounded-full ${current.badgeColor} ring-2 ring-white shadow-sm dark:ring-slate-900`}
        />
      </div>

      {showLabel && (
        <div className="flex flex-col text-left">
          <span className={`font-extrabold tracking-tight text-slate-900 dark:text-slate-100 ${cfg.labelTitle}`}>
            Avelor AI
          </span>
          <span className={`flex items-center gap-1 font-semibold ${current.textColor} ${cfg.labelSub}`}>
            {current.label}
          </span>
        </div>
      )}
    </div>
  );
}
