"use client";

import {
  ChartIncreaseIcon,
  CheckmarkCircle02Icon,
  PackageIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { AreaChart, type ChartPoint, Sparkline } from "@/components/ui/area-chart";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
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

const STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  paid: "success",
  processing: "brand",
  pending: "warning",
  failed: "danger",
  canceled: "neutral",
  refunded: "neutral",
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

/** Null when there is no comparable baseline — the card then hides the chip. */
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function shortId(id: string) {
  return id.length > 8 ? `#${id.slice(-8)}` : `#${id}`;
}

function DashboardCard({
  title,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-admin-line bg-admin-card", className)}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-4">
        <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-admin-line", className)} />;
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

  const topProducts = useMemo(() => {
    const byProduct = new Map<string, { name: string; units: number; revenueCents: number }>();
    for (const product of products) {
      byProduct.set(product.id, { name: product.name, units: 0, revenueCents: 0 });
    }
    for (const order of orders) {
      if (!REVENUE_STATUSES.includes(order.status)) continue;
      for (const item of order.items) {
        const entry = byProduct.get(item.productId);
        if (!entry) continue;
        entry.units += item.quantity;
        entry.revenueCents += item.totalPrice.amount;
      }
    }
    return [...byProduct.values()]
      .filter((entry) => entry.units > 0)
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 5);
  }, [orders, products]);

  const lowStock = useMemo(() => {
    const rows: { name: string; sku: string; quantity: number }[] = [];
    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.inventoryQuantity < LOW_STOCK) {
          rows.push({ name: product.name, sku: variant.sku, quantity: variant.inventoryQuantity });
        }
      }
    }
    return rows.sort((a, b) => a.quantity - b.quantity).slice(0, 4);
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

  return (
    <section id="admin-dashboard-page" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-none font-bold tracking-[-0.03em]">
            Hello, {firstName}!
          </h1>
          <p className="pt-2 text-[13px] text-muted">
            {todayLabel} · here is how {metrics?.tenantId ?? "the store"} is doing.
          </p>
        </div>
        <Segmented options={RANGES} value={range} onChange={setRange} ariaLabel="Revenue period" />
      </header>

      {error ? (
        <Alert tone="error">
          {error} — the admin API needs a running store backend and an admin session.
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard className="h-[132px]" />
          <SkeletonCard className="h-[132px]" />
          <SkeletonCard className="h-[132px]" />
          <SkeletonCard className="h-[132px]" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Revenue"
            value={formatMoney({ amount: current.revenueCents, currency: "USD" })}
            delta={pctDelta(current.revenueCents, previous.revenueCents)}
            caption={`Last ${range} days`}
            plot={<Sparkline points={series.map((b) => b.revenueCents)} />}
          />
          <MetricCard
            label="Orders"
            value={current.count}
            delta={pctDelta(current.count, previous.count)}
            caption={`${metrics?.orders.totalOrders ?? 0} lifetime`}
            plot={<Sparkline points={series.map((b) => b.orders)} />}
          />
          <MetricCard
            label="Paid rate"
            value={`${paidRate}%`}
            caption={`${metrics?.orders.paidOrders ?? 0} of ${metrics?.orders.totalOrders ?? 0} orders paid`}
          />
          <MetricCard
            label="Low stock"
            value={metrics?.catalog.lowStockVariants ?? 0}
            caption={`Variants under ${LOW_STOCK} units`}
          />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <DashboardCard
            title="Revenue"
            actions={
              <span className="flex items-center gap-2 text-[12px] text-muted">
                <HugeiconsIcon icon={ChartIncreaseIcon} size={15} strokeWidth={1.8} />
                {formatMoney({ amount: current.revenueCents, currency: "USD" })}
                <span className="text-subtle">/ {range}d</span>
              </span>
            }
          >
            <AreaChart
              points={chartPoints}
              formatValue={(cents) => formatMoneyCompact(cents)}
              className="h-64"
            />
          </DashboardCard>

          <DashboardCard title="Top products">
            {topProducts.length === 0 ? (
              <p className="text-[13px] text-subtle">No paid orders yet — products rank here.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-admin-line">
                {topProducts.map((product) => (
                  <li
                    key={product.name}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-admin-rail text-muted">
                      <HugeiconsIcon icon={PackageIcon} size={16} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {product.name}
                      </span>
                      <span className="block text-[11px] text-subtle tabular-nums">
                        {product.units} units
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                      {formatMoney({ amount: product.revenueCents, currency: "USD" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <DashboardCard title="Store health">
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="text-muted">Paid orders</span>
                  <span className="font-semibold tabular-nums">{paidRate}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-admin-rail">
                  <div
                    className="h-full rounded-full bg-admin-ink transition-[width] duration-500 ease-expo"
                    style={{ width: `${paidRate}%` }}
                  />
                </div>
              </div>

              {lowStock.length === 0 ? (
                <p className="flex items-center gap-2 text-[12px] text-muted">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={1.8} />
                  Inventory is healthy — nothing under {LOW_STOCK} units.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {lowStock.map((row) => (
                    <li key={row.sku} className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium">{row.name}</span>
                        <span className="block truncate text-[11px] text-subtle">{row.sku}</span>
                      </span>
                      <Badge tone={row.quantity === 0 ? "danger" : "warning"}>
                        {row.quantity} left
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Recent orders"
            actions={
              <span className="text-[11px] font-medium text-subtle">
                <HugeiconsIcon icon={ShoppingBag01Icon} size={14} strokeWidth={1.8} />
              </span>
            }
          >
            {recentOrders.length === 0 ? (
              <p className="text-[13px] text-subtle">No orders yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-admin-line">
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium">
                        {order.customerEmail}
                      </span>
                      <span className="block text-[11px] text-subtle tabular-nums">
                        {shortId(order.id)} ·{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums">
                      {formatMoney(order.total)}
                    </span>
                    <Badge tone={STATUS_TONES[order.status]}>{order.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>
      </div>
    </section>
  );
}
