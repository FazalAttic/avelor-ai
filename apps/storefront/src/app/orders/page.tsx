import { ChatShell } from "@/components/chat-shell";
import { PageHeader } from "@/components/page-header";
import { ProductThumb } from "@/components/product-thumb";
import { cn } from "@/lib/utils";

type OrderItem = {
  name: string;
  qty: number;
  price: string;
  image: string;
};

type Order = {
  id: string;
  date: string;
  status: string;
  items: OrderItem[];
  total: string;
};

const ORDERS: Order[] = [
  {
    id: "#AV-1042",
    date: "Oct 12, 2026",
    status: "Delivered",
    items: [
      { name: "Volt Runner", qty: 1, price: "$129", image: "/products/volt-runner.png" },
      { name: "Arc Cap", qty: 1, price: "$29", image: "/products/arc-cap.png" },
    ],
    total: "$158",
  },
  {
    id: "#AV-1035",
    date: "Sep 28, 2026",
    status: "Out for delivery",
    items: [
      { name: "Drift Hoodie", qty: 1, price: "$89", image: "/products/drift-hoodie.png" },
      { name: "Pulse Buds", qty: 2, price: "$158", image: "/products/pulse-buds.png" },
    ],
    total: "$247",
  },
  {
    id: "#AV-1027",
    date: "Sep 3, 2026",
    status: "Delivered",
    items: [{ name: "Aura Watch", qty: 1, price: "$199", image: "/products/aura-watch.png" }],
    total: "$199",
  },
];

const STATUS_DOT: Record<string, string> = {
  Delivered: "bg-brand-cyan",
  "Out for delivery": "bg-brand-violet",
};

export default function OrdersPage() {
  return (
    <ChatShell>
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-end pb-4 sm:pb-6">
        <section className="flex max-h-full w-full max-w-2xl flex-col rounded-[32px] border border-white/50 bg-white/25 p-3 shadow-card backdrop-blur-2xl sm:p-4 dark:border-white/10 dark:bg-white/5">
          <PageHeader title="Orders" sub={`${ORDERS.length} orders`} />
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-1">
            {ORDERS.map((order) => (
              <article
                key={order.id}
                className="rounded-3xl border border-border bg-surface p-4 shadow-card sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{order.id}</p>
                    <p className="pt-0.5 text-xs text-subtle">
                      {order.date} · {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-wash px-2.5 py-1 text-xs font-medium text-foreground">
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full",
                        STATUS_DOT[order.status] ?? "bg-border-strong"
                      )}
                    />
                    {order.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {order.items.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <ProductThumb
                        src={item.image}
                        alt={item.name}
                        className="size-12 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        {item.qty > 1 && <p className="text-xs text-subtle">Qty {item.qty}</p>}
                      </div>
                      <p className="text-sm text-muted">{item.price}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <p className="text-sm text-subtle">
                    Total <span className="ml-1 font-semibold text-foreground">{order.total}</span>
                  </p>
                  <button
                    type="button"
                    className="text-sm font-semibold text-foreground transition-opacity duration-150 ease-expo hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                  >
                    View details
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </ChatShell>
  );
}
