"use client";

import { useState } from "react";
import { TrendBadge } from "@/components/ui/trend-badge";
import { cn } from "@/lib/utils";

export type ChartPoint = { readonly label: string; readonly value: number };

const W = 720;
const H = 240;
const TOP = 16;
const BOTTOM = 12;
const TICKS = 4;
const PITCH = 9;

const clampY = (y: number) => Math.min(H - BOTTOM, Math.max(TOP, y));

/**
 * Revenue as a comb: a tooth per slice of the window, hung from the line that
 * joins their tops. The teeth give the eye a mass to read — how much of the
 * period actually carried revenue — and the line gives it a direction.
 *
 * Hovering walks the cursor along the series and parks it on the nearest point;
 * with nothing hovered it rests on the newest one, so the card always states a
 * figure. `preserveAspectRatio="none"` stretches the plot into any box, so the
 * strokes carry `vectorEffect="non-scaling-stroke"` and everything that must
 * stay upright — the ticks, the head dot, the read-out — is HTML beside it.
 */
export function RevenueChart({
  points,
  formatValue,
  formatPoint,
  className,
}: {
  points: readonly ChartPoint[];
  formatValue: (value: number) => string;
  formatPoint: (value: number) => string;
  className?: string;
}) {
  const [cursor, setCursor] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div
        className={cn(
          "flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed",
          "border-admin-edge text-[13px] text-subtle",
          className
        )}
      >
        Not enough data yet — this fills in as orders come in.
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 1);
  const step = W / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: i * step,
    y: clampY(TOP + (1 - p.value / max) * (H - TOP - BOTTOM)),
  }));
  const line = coords.map((c, i) => `${i ? "L" : "M"} ${c.x} ${c.y}`).join(" ");

  const teeth: { x: number; y: number }[] = [];
  for (let x = 0; x <= W + 0.5; x += PITCH) {
    const t = Math.min(points.length - 1, x / step);
    const i = Math.min(points.length - 2, Math.floor(t));
    const fall = t - i;
    teeth.push({ x, y: coords[i].y + (coords[i + 1].y - coords[i].y) * fall });
  }

  const at = Math.min(points.length - 1, Math.max(0, cursor ?? points.length - 1));
  const head = coords[at];
  const previous = at > 0 ? points[at - 1].value : 0;
  const delta = at > 0 && previous > 0 ? ((points[at].value - previous) / previous) * 100 : null;

  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const y = TOP + (i / TICKS) * (H - TOP - BOTTOM);
    return { y, text: formatValue(max * (1 - i / TICKS)) };
  });
  const every = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div
      className={cn("grid gap-x-2 gap-y-2", className)}
      style={{
        gridTemplateColumns: "2.25rem minmax(0,1fr)",
        gridTemplateRows: "minmax(0,1fr) auto",
      }}
    >
      <div className="relative" aria-hidden>
        {ticks.map((tick) => (
          <span
            key={`tick-${tick.y}`}
            style={{ top: `${(tick.y / H) * 100}%` }}
            className="absolute right-0 -translate-y-1/2 text-[10px] font-medium tabular-nums text-subtle"
          >
            {tick.text}
          </span>
        ))}
      </div>

      <div className="relative" aria-hidden>
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative plot; the readable values are the HTML ticks and the read-out beside it */}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
          {ticks.map((tick, i) => (
            <line
              key={`grid-${tick.y}`}
              x1={0}
              x2={W}
              y1={tick.y}
              y2={tick.y}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className={i === TICKS ? "stroke-admin-line" : "stroke-chart-grid"}
            />
          ))}
          {teeth.map((tooth) => (
            <line
              key={`tooth-${tooth.x}`}
              x1={tooth.x}
              x2={tooth.x}
              y1={tooth.y}
              y2={H}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className="stroke-chart-comb"
            />
          ))}
          <line
            x1={head.x}
            x2={head.x}
            y1={head.y}
            y2={H}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            className="stroke-chart-line"
          />
          <path
            d={line}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-chart-line"
          />
        </svg>

        <span
          style={{ left: `${(head.x / W) * 100}%`, top: `${(head.y / H) * 100}%` }}
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-admin-card bg-chart-line"
        />

        {/* The read-out rides along with the cursor rather than sitting in a
            corner — parked at the right it read as frozen even while the
            column moved. clamp() keeps it inside the plot at both ends. */}
        <div
          style={{ left: `clamp(70px, ${(head.x / W) * 100}%, calc(100% - 70px))` }}
          className="module-edge pointer-events-none absolute top-0 w-[140px] -translate-x-1/2 rounded-xl bg-admin-card px-3 py-2"
        >
          <p className="text-[11px] whitespace-nowrap text-subtle">{points[at].label}</p>
          <p className="flex items-center gap-2 pt-0.5">
            <span className="font-numbers text-[14px] font-medium text-admin-ink tabular-nums">
              {formatPoint(points[at].value)}
            </span>
            {delta === null ? null : <TrendBadge value={delta} />}
          </p>
        </div>

        <div
          className="absolute inset-0 cursor-crosshair"
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const along = ((event.clientX - box.left) / box.width) * (points.length - 1);
            setCursor(Math.round(along));
          }}
          onPointerLeave={() => setCursor(null)}
        />
      </div>

      <span />

      <div className="flex justify-between text-[10px] font-medium text-subtle">
        {points.map((p, i) =>
          i % every === 0 || i === points.length - 1 ? (
            <span key={`${p.label}-${i}`} className="tabular-nums">
              {p.label}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}
