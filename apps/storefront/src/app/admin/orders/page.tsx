"use client";

import { InboxIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { type Column, DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, SearchField } from "@/components/ui/filter-bar";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  type AdminOrder,
  fetchOrders,
  formatMoney,
  type OrderStatus,
  setOrderStatus,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

/** Mirrors isValidOrderStatusTransition in @avelor/core — the API is the gate. */
const NEXT_STATUSES: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["processing", "paid", "failed", "canceled"],
  processing: ["paid", "failed", "canceled"],
  paid: ["refunded"],
  failed: [],
  canceled: [],
  refunded: [],
};

const FILTERS: readonly { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Pending" },
  { value: "canceled", label: "Canceled" },
];

const DATE_STYLE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function placedOn(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_STYLE.format(date);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<readonly AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOrders()
      .then((result) => {
        if (cancelled) return;
        setOrders(result);
        setFailure(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setFailure(cause instanceof Error ? cause.message : "Request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const needle = search.trim().toLowerCase();
  const rows = orders
    .filter((order) => status === "all" || order.status === status)
    .filter(
      (order) =>
        !needle ||
        order.customerEmail.toLowerCase().includes(needle) ||
        order.id.toLowerCase().includes(needle)
    )
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const revenue = rows
    .filter((order) => order.status === "paid" || order.status === "processing")
    .reduce((sum, order) => sum + order.total.amount, 0);

  async function move(order: AdminOrder, next: OrderStatus) {
    setMoving(order.id);
    try {
      const updated = await setOrderStatus(order.id, next);
      setOrders((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      setFailure(null);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Request failed");
    } finally {
      setMoving(null);
    }
  }

  const columns: readonly Column<AdminOrder>[] = [
    {
      key: "order",
      header: "Order",
      width: "w-[18%]",
      cell: (order) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] font-semibold text-admin-ink">
            {order.id.slice(0, 8)}
          </p>
          <p className="truncate text-[11px] text-muted">{placedOn(order.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      hide: "md",
      cell: (order) => <span className="truncate text-admin-ink">{order.customerEmail}</span>,
    },
    {
      key: "items",
      header: "Items",
      hide: "lg",
      width: "w-[30%]",
      cell: (order) => {
        const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <div className="min-w-0">
            <p className="truncate text-admin-ink">
              {order.items[0]?.title ?? "No line items"}
              {order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}
            </p>
            <p className="text-[11px] text-muted">
              {units} {units === 1 ? "unit" : "units"}
            </p>
          </div>
        );
      },
    },
    {
      key: "total",
      header: "Total",
      align: "end",
      cell: (order) => <span className="font-semibold">{formatMoney(order.total)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "move",
      header: <span className="sr-only">Move to</span>,
      align: "end",
      cell: (order) => {
        const targets = NEXT_STATUSES[order.status];
        if (targets.length === 0) return <span className="text-muted">—</span>;
        return (
          <SelectField
            hideLabel
            className="ml-auto w-fit"
            label={`Move order ${order.id.slice(0, 8)} to another status`}
            value=""
            disabled={moving === order.id}
            onChange={(event) => {
              const next = event.target.value as OrderStatus;
              if (next) move(order, next);
            }}
            options={[
              { value: "", label: "Move to…" },
              ...targets.map((value) => ({
                value,
                label: value.charAt(0).toUpperCase() + value.slice(1),
              })),
            ]}
          />
        );
      },
    },
  ];

  return (
    <section id="admin-orders-page" className="flex flex-col gap-4">
      {failure ? <Alert>{failure}</Alert> : null}

      <FilterBar>
        <SearchField
          value={search}
          onChange={setSearch}
          label="Search orders"
          placeholder="Email or order id…"
        />
        <Segmented
          ariaLabel="Filter by status"
          options={FILTERS}
          value={status}
          onChange={setStatus}
        />
      </FilterBar>

      <Panel className="border-admin-edge bg-admin-card">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(order) => order.id}
          caption="Orders"
          loading={loading}
          empty={
            <EmptyState
              icon={<HugeiconsIcon icon={InboxIcon} size={18} strokeWidth={1.8} />}
              title={needle || status !== "all" ? "No matching orders" : "No orders yet"}
              description={
                needle || status !== "all"
                  ? "Try another email, or clear the filters to see every order."
                  : "Orders placed in the storefront land here as soon as they are created."
              }
            />
          }
        />
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] text-muted">
          <span>
            Showing {rows.length} of {orders.length} orders
          </span>
          <span className={cn("font-semibold text-admin-ink", !rows.length && "text-muted")}>
            {formatMoney({ amount: revenue, currency: "USD" })} collected
          </span>
        </div>
      </Panel>
    </section>
  );
}
