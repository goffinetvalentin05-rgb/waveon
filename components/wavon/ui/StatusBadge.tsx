import { badgeCancelled, badgeConfirmed, badgePending } from "@/lib/wavon/tokens";

const style: Record<string, string> = {
  confirmed: badgeConfirmed,
  pending: badgePending,
  cancelled: badgeCancelled,
};

const labels: Record<string, string> = {
  confirmed: "Confirmé",
  pending: "En attente",
  cancelled: "Annulé",
};

export function StatusBadge({ status }: { status: string }) {
  const c = style[status] ?? badgePending;
  const label = labels[status] ?? status;
  return <span className={c}>{label}</span>;
}
