import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-border text-muted",
  brand: "border-transparent bg-brand-wash text-brand-blue",
  success: "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  warning: "border-transparent bg-amber-500/14 text-amber-700 dark:text-amber-400",
  danger: "border-transparent bg-red-500/12 text-red-600 dark:text-red-400",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[11px] font-semibold whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
