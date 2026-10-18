"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { type Metric, MetricGroup } from "@/components/ui/metric-group";
import { RecentOrders } from "@/components/ui/recent-orders";
import { type ChartPoint, RevenueChart } from "@/components/ui/revenue-chart";
import { Segmented } from "@/components/ui/segmented";
import { type RankedProduct, TopProducts } from "@/components/ui/top-products";
import {
  type AdminMetrics,
  type AdminMoney,
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

const LOW_STOCK = 5;

/** Newest slice only — the orders route is the full ledger. */
const ORDER_ROWS = 8;

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

const RANK_BUCKETS = 5;

/** What the card quotes: a listing can be several prices, so lead with the entry one. */
function lowestPrice(product: AdminProduct): AdminMoney {
  const prices = product.variants.map((variant) => variant.price);
  return prices.reduce<AdminMoney>(
    (low, price) => (price.amount < low.amount ? price : low),
    prices[0] ?? { amount: 0, currency: "USD" }
  );
}

/**
 * Units sold per product over the open window, best first, each row carrying
 * the same count split into buckets so the card shows *when* they went as well
 * as how many. Products that never sold are left out rather than ranked last —
 * a zero at the bottom of a "top selling" list is not a rank.
 */
function rankProducts(
  products: readonly AdminProduct[],
  orders: readonly AdminOrder[],
  range: number
): RankedProduct[] {
  const from = startOfToday().getTime() - range * DAY_MS;
  const width = (range * DAY_MS) / RANK_BUCKETS;
  const zeros = () => Array.from({ length: RANK_BUCKETS }, () => 0);
  const tally = new Map<string, { units: number; buckets: number[] }>();

  for (const order of orders) {
    if (!REVENUE_STATUSES.includes(order.status)) continue;
    const at = new Date(order.createdAt).getTime();
    if (at < from) continue;
    const bucket = Math.min(RANK_BUCKETS - 1, Math.floor((at - from) / width));
    for (const item of order.items) {
      const row = tally.get(item.productId) ?? { units: 0, buckets: zeros() };
      row.units += item.quantity;
      row.buckets[bucket] += item.quantity;
      tally.set(item.productId, row);
    }
  }

  const label = new Intl.DateTimeFormat(
    "en-US",
    range <= 14 ? { weekday: "short" } : { month: "short", day: "numeric" }
  );

  return products
    .map((product) => {
      const row = tally.get(product.id);
      return {
        product,
        units: row?.units ?? 0,
        price: lowestPrice(product),
        points: (row?.buckets ?? zeros()).map((value, i) => ({
          label: label.format(new Date(from + (i + 1) * width)),
          value,
        })),
      };
    })
    .filter((row) => row.units > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, RANK_BUCKETS);
}

/**
 * Every order in the open window, newest first. Unlike the revenue maths this
 * keeps the failed and refunded ones — the table is where you see them.
 */
function recentOrders(orders: readonly AdminOrder[], range: number): readonly AdminOrder[] {
  const from = startOfToday().getTime() - (range - 1) * DAY_MS;
  return orders
    .filter((order) => new Date(order.createdAt).getTime() >= from)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
  const [rankIndex, setRankIndex] = useState(0);
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

  const ranked = useMemo(() => rankProducts(products, orders, range), [products, orders, range]);
  const inPeriod = useMemo(() => recentOrders(orders, range), [orders, range]);

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
  const growthCents = current.revenueCents - previous.revenueCents;

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
              <span className="font-numbers text-[12px] text-subtle tabular-nums">
                {range} days
              </span>
            }
          >
            <Panel>
              <p className="text-[13px] font-medium text-muted">Total revenue</p>
              <p className="font-numbers pt-1.5 text-[32px] leading-[1.1] font-medium tracking-[-0.025em] text-admin-ink tabular-nums">
                {revenue}
              </p>
              <p className="pt-1 text-[12px] text-muted">
                <span className={growthCents >= 0 ? "text-delta-up" : "text-delta-down"}>
                  {growthCents >= 0 ? "+" : "−"}
                  {formatMoney({ amount: Math.abs(growthCents), currency: "USD" })}
                </span>{" "}
                vs previous {range} days
              </p>
              <RevenueChart
                points={chartPoints}
                formatValue={(cents) => formatMoneyCompact(cents)}
                formatPoint={(cents) => formatMoney({ amount: cents, currency: "USD" })}
                className="mt-5 h-[230px]"
              />
            </Panel>
          </Group>

          <Group title="Recent orders" action={<SeeAll href="/admin/orders" />}>
            <RecentOrders
              rows={inPeriod.slice(0, ORDER_ROWS)}
              total={inPeriod.length}
              periodDays={range}
              periodCents={current.revenueCents}
              periodCount={current.count}
              loading={loading}
            />
          </Group>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Group
            title="Top selling products"
            action={
              <span className="font-numbers text-[12px] text-subtle tabular-nums">
                {range} days
              </span>
            }
          >
            <Panel className="flex h-full flex-col">
              <TopProducts items={ranked} index={rankIndex} onIndexChange={setRankIndex} />
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
