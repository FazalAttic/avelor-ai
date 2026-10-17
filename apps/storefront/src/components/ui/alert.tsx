import { AlertCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AlertTone = "error" | "success";

const TONES: Record<AlertTone, { box: string; icon: typeof AlertCircleIcon }> = {
  error: {
    box: "border-red-500/25 text-red-700 dark:text-red-400",
    icon: AlertCircleIcon,
  },
  success: {
    box: "border-emerald-500/25 text-emerald-700 dark:text-emerald-400",
    icon: CheckmarkCircle02Icon,
  },
};

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  const { box, icon } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border bg-surface px-3 py-2.5 text-[13px] leading-snug",
        box,
        className
      )}
    >
      <HugeiconsIcon icon={icon} size={16} strokeWidth={2} className="mt-px shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
