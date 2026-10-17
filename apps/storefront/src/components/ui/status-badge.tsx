import { Badge, type BadgeTone } from "./badge";

const TONES: Record<string, BadgeTone> = {
  active: "success",
  draft: "neutral",
  archived: "neutral",
  pending: "warning",
  processing: "brand",
  paid: "success",
  failed: "danger",
  canceled: "danger",
  refunded: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge tone={TONES[status] ?? "neutral"}>{label}</Badge>;
}
