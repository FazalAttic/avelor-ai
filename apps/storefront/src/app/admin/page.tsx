"use client";

import { ArrowRight01Icon, ChartIncreaseIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { AreaChart, type ChartPoint } from "@/components/ui/area-chart";
import { type Metric, MetricGroup } from "@/components/ui/metric-group";
import { Segmented } from "@/components/ui/segmented";
import {
  type AdminMetrics,
  type AdminOrder,
  type AdminProduct,
  fetchMetrics,
  fetchOrders,
  fetchProducts,
  formatMoney,
  formatMoneyCompact,
  type OrderStatus,
} from "@/lib/admin-api";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const RANGES: readonly { value: number; label: string }[] = [
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
];

const DAY_MS = 86_400_000;

/** Orders that count toward revenue — the same rule the metrics endpoint uses. */
const REVENUE_STATUSES: readonly OrderStatus[] = ["paid", "processing"];

/* Status is a word on the same line as its order, not a coloured pill. Five
   chips stacked down the right edge of a box is what made it shout, and the
   state is only interesting when it is not the normal one — so paid and
   processing carry colour and everything settled carries none. */
const STATUS_TEXT: Record<OrderStatus, string> = {
  paid: "text-delta-up",
  processing: "text-brand-blue",
  pending: "text-muted",
  failed: "text-delta-down",
  canceled: "text-subtle",
  refunded: "text-subtle",
};

const LOW_STOCK = 5;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type Bucket = { readonly date: Date; readonly revenueCents: number; readonly orders: number };

function buildDailySeries(orders: readonly AdminOrder[], days: number): Bucket[] {
  const today = startOfToday();
  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(today.getTime() - (days - 1 - i) * DAY_MS);
    return { date, revenueCents: 0, orders: 0 };
  });

  for (const order of orders) {
    if (!REVENUE_STATUSES.includes(order.status)) continue;
    const at = new Date(order.createdAt);
    at.setHours(0, 0, 0, 0);
    const index = days - 1 + Math.round((at.getTime() - today.getTime()) / DAY_MS);
    if (index < 0 || index >= days) continue;
    const current = buckets[index];
    buckets[index] = {
      date: current.date,
      revenueCents: current.revenueCents + order.total.amount,
      orders: current.orders + 1,
    };
  }

  return buckets;
}

function sumWindow(orders: readonly AdminOrder[], fromDaysAgo: number, toDaysAgo: number) {
  const today = startOfToday();
  let revenueCents = 0;
  let count = 0;
  for (const order of orders) {
    if (!REVENUE_STATUSES.includes(order.status)) continue;
    const at = new Date(order.createdAt).getTime();
    if (at < today.getTime() - fromDaysAgo * DAY_MS) continue;
    if (at >= today.getTime() - toDaysAgo * DAY_MS) continue;
    revenueCents += order.total.amount;
    count += 1;
  }
  return { revenueCents, count };
}

/** Null when there is no comparable baseline — the chip then stays hidden. */
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * A group is a name and then a surface. The title sits outside the box, the way
 * it does in the reference, so the box itself never has to announce itself and
 * the page reads as a list of questions rather than a grid of panels.
 */
function Group({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2.5", className)}>
      <header className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-admin-ink">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("module-edge rounded-2xl bg-admin-card p-5", className)}>{children}</div>
  );
}

function SeeAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-[12px] font-semibold text-muted transition-colors duration-150 ease-expo hover:text-admin-ink"
    >
      See all
      <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
    </Link>
  );
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [range, setRange] = useState<number>(14);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [orders, setOrders] = useState<readonly AdminOrder[]>([]);
  const [products, setProducts] = useState<readonly AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [m, o, p] = await Promise.all([fetchMetrics(), fetchOrders(), fetchProducts()]);
        if (cancelled) return;
        setMetrics(m);
        setOrders(o);
        setProducts(p.items);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load store metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const series = useMemo(() => buildDailySeries(orders, range), [orders, range]);
  const previous = useMemo(() => sumWindow(orders, range * 2, range), [orders, range]);
  const current = useMemo(() => sumWindow(orders, range, 0), [orders, range]);

  const chartPoints: ChartPoint[] = useMemo(
    () =>
      series.map((bucket) => ({
        label: bucket.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: bucket.revenueCents,
      })),
    [series]
  );

  const catalogue = useMemo(() => {
    let live = 0;
    let draft = 0;
    let soldOut = 0;
    let low = 0;
    for (const product of products) {
      if (product.status === "active") live += 1;
      if (product.status === "draft") draft += 1;
      for (const variant of product.variants) {
        if (variant.inventoryQuantity === 0) soldOut += 1;
        else if (variant.inventoryQuantity < LOW_STOCK) low += 1;
      }
    }
    return { live, draft, soldOut, low };
  }, [products]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [orders]
  );

  const firstName = (session?.user?.name ?? "there").split(" ")[0];
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const paidRate =
    metrics && metrics.orders.totalOrders > 0
      ? Math.round((metrics.orders.paidOrders / metrics.orders.totalOrders) * 100)
      : 0;
  const revenue = formatMoney({ amount: current.revenueCents, currency: "USD" });

  const overview: Metric[] = [
    {
      label: "Revenue",
      value: revenue,
      delta: pctDelta(current.revenueCents, previous.revenueCents),
      caption: `Previous ${range} days: ${formatMoneyCompact(previous.revenueCents)}`,
    },
    {
      label: "Orders",
      value: current.count,
      delta: pctDelta(current.count, previous.count),
      caption: `Previous ${range} days: ${previous.count}`,
    },
    {
      label: "Paid rate",
      value: `${paidRate}%`,
      caption: `${metrics?.orders.paidOrders ?? 0} of ${metrics?.orders.totalOrders ?? 0} orders paid`,
    },
    {
      label: "Low stock",
      value: metrics?.catalog.lowStockVariants ?? 0,
      caption: `Variants under ${LOW_STOCK} units`,
    },
  ];

  return (
    <section id="admin-dashboard-page" className="flex flex-col gap-6">
      <header>
        <h1 className="text-[30px] leading-none font-bold tracking-[-0.03em] text-admin-ink">
          Hello, {firstName}!
        </h1>
        <p className="pt-2.5 text-[13px] text-muted">
          {todayLabel} · here is how {metrics?.tenantId ?? "the store"} is doing.
        </p>
      </header>

      {error ? (
        <Alert tone="error">
          {error} — the admin API needs a running store backend and an admin session.
        </Alert>
      ) : null}

      <div className="grid min-w-0 gap-x-6 gap-y-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Group
            title="Overview performance"
            action={
              <Segmented
                options={RANGES}
                value={range}
                onChange={setRange}
                ariaLabel="Revenue period"
              />
            }
          >
            <MetricGroup metrics={overview} loading={loading} />
          </Group>

          <Group
            title="Revenue"
            action={
              <span className="flex items-center gap-2 text-[12px] text-muted">
                <HugeiconsIcon icon={ChartIncreaseIcon} size={15} strokeWidth={1.8} />
                <span className="font-numbers font-medium text-admin-ink tabular-nums">
                  {revenue}
                </span>
                <span className="text-subtle">/ {range}d</span>
              </span>
            }
          >
            <Panel>
              <AreaChart
                points={chartPoints}
                formatValue={(cents) => formatMoneyCompact(cents)}
                className="h-[290px]"
              />
            </Panel>
          </Group>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Group title="Recent orders" action={<SeeAll href="/admin/orders" />}>
            <Panel>
              {recentOrders.length === 0 ? (
                <p className="text-[13px] text-subtle">No orders yet.</p>
              ) : (
                <ul className="flex flex-col divide-y-[1.5px] divide-admin-edge">
                  {recentOrders.map((order) => (
                    <li
                      key={order.id}
                      className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-admin-ink">
                          {order.customerEmail}
                        </span>
                        <span className="font-numbers block pt-1 text-[11px] text-subtle tabular-nums">
                          {dayLabel(order.createdAt)} ·{" "}
                          <span className={STATUS_TEXT[order.status]}>{order.status}</span>
                        </span>
                      </span>
                      <span className="font-numbers shrink-0 text-[13px] font-medium text-admin-ink tabular-nums">
                        {formatMoney(order.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </Group>

          <Group title="Products" action={<SeeAll href="/admin/products" />}>
            <Panel>
              <ul className="flex flex-col divide-y-[1.5px] divide-admin-edge">
                {[
                  { label: "Live listings", value: catalogue.live },
                  { label: "Drafts", value: catalogue.draft },
                  { label: "Sold-out variants", value: catalogue.soldOut },
                  { label: `Under ${LOW_STOCK} units`, value: catalogue.low },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="text-[13px] text-muted">{row.label}</span>
                    <span className="font-numbers text-[15px] font-medium text-admin-ink tabular-nums">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </Group>
        </div>
      </div>
    </section>
  );
}
