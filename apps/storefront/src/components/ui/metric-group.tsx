import type { ReactNode } from "react";
import { TrendBadge } from "@/components/ui/trend-badge";
import { cn } from "@/lib/utils";

export interface Metric {
  readonly label: string;
  readonly value: ReactNode;
  readonly delta?: number | null;
  readonly caption?: ReactNode;
}

/**
 * Four readings, one surface. Separate cards make the eye scan four widgets;
 * the numbers here are one block of store performance, so the divisions are
 * internal rules drawn with the same edge, at the same 1.5px weight, as the
 * outline around them.
 *
 * Which side each cell rules depends on where it lands once the grid folds:
 * every cell after the first needs a top line while stacked, and from `sm` only
 * the second row keeps that line while the right-hand column grows a left one
 * instead. `divide-x` cannot express that — it would rule the first cell of the
 * second row too.
 */
export function MetricGroup({
  metrics,
  loading = false,
  className,
}: {
  metrics: readonly Metric[];
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "module-edge grid overflow-hidden rounded-2xl bg-admin-card sm:grid-cols-2",
        className
      )}
    >
      {metrics.map((metric, i) => (
        <MetricCell key={metric.label} metric={metric} loading={loading} className={dividers(i)} />
      ))}
    </div>
  );
}

function dividers(i: number) {
  if (i === 0) return "";
  return cn(i > 1 ? "module-edge-t" : "max-sm:module-edge-t", i % 2 === 1 && "sm:module-edge-l");
}

function MetricCell({
  metric,
  loading,
  className,
}: {
  metric: Metric;
  loading: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 p-5", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{metric.label}</p>
        {!loading && metric.delta !== undefined && metric.delta !== null ? (
          <TrendBadge value={metric.delta} />
        ) : null}
      </div>

      {loading ? (
        <div className="my-1 h-8 w-28 animate-pulse rounded-md bg-admin-line" />
      ) : (
        <p className="font-numbers text-[32px] leading-[1.1] font-medium tracking-[-0.025em] text-admin-ink tabular-nums">
          {metric.value}
        </p>
      )}

      {loading ? (
        <div className="mt-1 h-3 w-20 animate-pulse rounded bg-admin-line" />
      ) : (
        <p className="truncate text-[12px] text-subtle">{metric.caption}</p>
      )}
    </div>
  );
}
