import { cn } from "@/lib/utils";

export type ChartPoint = { readonly label: string; readonly value: number };

const W = 720;
const H = 240;
const TOP = 16;
const BOTTOM = 12;
const TICKS = 4;

const clampY = (y: number) => Math.min(H - BOTTOM, Math.max(TOP, y));

function splinePath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p0 = pts[i - 1] ?? p1;
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clampY(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clampY(p2.y - (p3.y - p1.y) / 6) };
    d += ` C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Line + area chart drawn as inline SVG — no chart dependency.
 * preserveAspectRatio="none" stretches the plot into any box, so strokes carry
 * vectorEffect="non-scaling-stroke" to keep their pixel weight and everything
 * that must stay round or upright (ticks, the head dot) is HTML beside it.
 */
export function AreaChart({
  points,
  formatValue,
  className,
}: {
  points: readonly ChartPoint[];
  formatValue: (value: number) => string;
  className?: string;
}) {
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
  const line = splinePath(coords);
  const head = coords[coords.length - 1];
  const area = `${line} L ${head.x} ${H} L ${coords[0].x} ${H} Z`;
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
            className="font-numbers absolute right-0 -translate-y-1/2 text-[10px] font-medium text-subtle tabular-nums"
          >
            {tick.text}
          </span>
        ))}
      </div>

      <div className="relative" aria-hidden>
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative plot; the readable values are the HTML ticks beside it */}
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
          <path d={area} className="fill-chart-area" />
          <path
            d={line}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-chart-line"
          />
        </svg>

        <span
          style={{ left: `${(head.x / W) * 100}%`, top: `${(head.y / H) * 100}%` }}
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-admin-card bg-chart-line"
        />
      </div>

      <span />

      <div className="font-numbers flex justify-between text-[10px] font-medium text-subtle">
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

/** The same plot maths at card size: no axes, no labels, just the shape. */
export function Sparkline({
  points,
  tone = "ink",
  className,
}: {
  points: readonly number[];
  tone?: "ink" | "brand";
  className?: string;
}) {
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const w = 120;
  const h = 32;
  const coords = points.map((value, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - 2 - ((value - min) / span) * (h - 4),
  }));
  const line = splinePath(coords);

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative sparkline inside a labelled metric card
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <path
        d={`${line} L ${w} ${h} L 0 ${h} Z`}
        className={tone === "brand" ? "fill-brand-wash" : "fill-chart-area"}
      />
      <path
        d={line}
        fill="none"
        strokeWidth={1.75}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className={tone === "brand" ? "stroke-brand-blue" : "stroke-chart-line"}
      />
    </svg>
  );
}
