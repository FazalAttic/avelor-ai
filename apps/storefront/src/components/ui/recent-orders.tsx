"use client";

import { type Column, DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { type AdminOrder, formatMoney } from "@/lib/admin-api";

/** The same rule the dashboard bills on — anything else never touched revenue. */
const COUNTED: ReadonlySet<string> = new Set(["paid", "processing"]);

const DATE_STYLE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** The order carries no profile, so the email's local part becomes the monogram. */
function initials(email: string) {
  const parts = (email.split("@")[0] ?? "").split(/[.\-_+]+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase();
}

function agoLabel(iso: string) {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return "—";
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return DATE_STYLE.format(new Date(at));
}

/**
 * The period's orders, newest first, with enough of each one on the row to read
 * it without opening the order: who, what, how it went, and how much of the
 * period this order actually was.
 */
export function RecentOrders({
  rows,
  total,
  periodDays,
  periodCents,
  periodCount,
  loading = false,
}: {
  rows: readonly AdminOrder[];
  total: number;
  periodDays: number;
  periodCents: number;
  periodCount: number;
  loading?: boolean;
}) {
  const columns: readonly Column<AdminOrder>[] = [
    {
      key: "customer",
      header: "Customer",
      width: "w-[26%]",
      cell: (order) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-admin-line/60 text-[10px] font-semibold text-admin-ink">
            {initials(order.customerEmail)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-admin-ink">{order.customerEmail}</span>
            <span className="block truncate text-[11px] text-muted">
              {agoLabel(order.createdAt)}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "order",
      header: "Order",
      width: "w-[12%]",
      cell: (order) => (
        <span className="font-numbers text-[12px] tabular-nums text-muted">
          #{order.id.replace("ord_", "").slice(0, 8)}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      width: "w-[30%]",
      cell: (order) => {
        const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const extra = order.items.length - 1;
        return (
          <div className="min-w-0">
            <p className="truncate text-admin-ink">
              {order.items[0]?.title ?? "No line items"}
              {extra > 0 ? <span className="text-muted"> +{extra} more</span> : null}
            </p>
            <p className="text-[11px] text-muted">
              {units} {units === 1 ? "unit" : "units"}
            </p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "w-[14%]",
      cell: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "total",
      header: "Total",
      align: "end",
      cell: (order) => {
        const counted = COUNTED.has(order.status);
        const share =
          counted && periodCents > 0
            ? `${Math.round((order.total.amount / periodCents) * 100)}% of revenue`
            : "not counted";
        return (
          <div>
            <p className="text-[13px] font-medium text-admin-ink">{formatMoney(order.total)}</p>
            <p className="text-[11px] text-muted">{share}</p>
          </div>
        );
      },
    },
  ];

  return (
    <div id="admin-recent-orders" className="module-edge overflow-hidden rounded-2xl bg-admin-card">
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(order) => order.id}
        caption={`Orders from the last ${periodDays} days`}
        fixed
        loading={loading}
        skeletonRows={6}
        empty={
          <p className="py-2 text-center text-[13px] text-subtle">
            Nothing was ordered in the last {periodDays} days — widen the period to see older sales.
          </p>
        }
      />
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] text-muted">
        <span>
          Showing {rows.length} of {total} orders in {periodDays} days
        </span>
        <span>
          {formatMoney({
            amount: periodCount > 0 ? Math.round(periodCents / periodCount) : 0,
            currency: "USD",
          })}{" "}
          average order
        </span>
      </div>
    </div>
  );
}
