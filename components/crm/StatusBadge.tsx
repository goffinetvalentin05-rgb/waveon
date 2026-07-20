import { statusStyle } from "@/lib/crm/status";

export function StatusBadge({ status }: { status: string }) {
  const s = statusStyle(status);
  return (
    <span className={`crm-badge ${s.bg} ${s.text}`}>
      <span className={`crm-badge-dot ${s.dot}`} />
      {s.label}
    </span>
  );
}
