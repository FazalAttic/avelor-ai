import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export function TrendBadge({
  value,
  suffix = "%",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5",
        "text-[11px] font-bold tabular-nums whitespace-nowrap",
        up ? "bg-delta-up-wash text-delta-up" : "bg-delta-down-wash text-delta-down",
        className
      )}
    >
      <HugeiconsIcon icon={up ? ArrowUp01Icon : ArrowDown01Icon} size={11} strokeWidth={2.6} />
      {`${up ? "+" : "−"}${Math.abs(value).toFixed(1)}${suffix}`}
    </span>
  );
}
