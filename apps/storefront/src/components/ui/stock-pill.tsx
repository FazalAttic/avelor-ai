import { Badge } from "./badge";

export function StockPill({ quantity, low = 5 }: { quantity: number; low?: number }) {
  if (quantity <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (quantity < low) return <Badge tone="warning">{`${quantity} left`}</Badge>;
  return <span className="font-numbers text-[13px] text-admin-ink tabular-nums">{quantity}</span>;
}
