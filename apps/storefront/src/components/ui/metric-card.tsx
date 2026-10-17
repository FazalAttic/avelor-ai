import type { ReactNode } from "react";
import { TrendBadge } from "@/components/ui/trend-badge";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  delta,
  caption,
  plot,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  caption?: ReactNode;
  plot?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-3 rounded-2xl border border-admin-line bg-admin-card p-4",
        className
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-subtle uppercase">{label}</p>
        {delta !== undefined && delta !== null ? <TrendBadge value={delta} /> : null}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums">
          {value}
        </p>
        {caption ? <p className="pt-2 text-[12px] leading-snug text-muted">{caption}</p> : null}
      </div>

      {plot ? <div className="h-8">{plot}</div> : null}
    </div>
  );
}
