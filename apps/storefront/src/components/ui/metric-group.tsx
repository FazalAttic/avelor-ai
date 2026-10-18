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
 * internal hairlines drawn with the same edge every other border uses.
 *
 * The divider classes are per index rather than `divide-x` because a 2-column
 * grid puts `border-left` on the first cell of the second row too. Mobile
 * stacks, so every cell after the first needs a top rule and the side rules
 * only arrive at `sm`.
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
        "grid overflow-hidden rounded-2xl border border-admin-edge bg-admin-card sm:grid-cols-2",
        className
      )}
    >
      {metrics.map((metric, i) => (
        <MetricCell
          key={metric.label}
          metric={metric}
          loading={loading}
          className={cn(
            i > 0 && "border-t border-admin-edge",
            i % 2 === 1 && "sm:border-l",
            i === 1 && "sm:border-t-0"
          )}
        />
      ))}
    </div>
  );
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
        <p className="font-numbers text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] text-admin-ink tabular-nums">
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
