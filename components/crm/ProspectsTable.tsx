"use client";

import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { StatusSelect } from "@/components/crm/StatusSelect";
import { formatLastContact, getNextActionDisplay } from "@/lib/crm/follow-up-display";
import { prospectDetailHref } from "@/lib/crm/paths";
import type { Prospect, ProspectStatus } from "@/lib/crm/types";

const TEMPORAL: Record<string, string> = {
  today: "text-amber-300",
  overdue: "text-rose-300",
  future: "text-wo-muted",
  none: "text-wo-dim",
};

export function ProspectsTable({
  prospects,
  listReturnUrl,
  onStatusChange,
}: {
  prospects: Prospect[];
  listReturnUrl: string;
  onStatusChange: (id: string, status: ProspectStatus) => void;
}) {
  const router = useRouter();

  if (prospects.length === 0) return null;

  return (
    <div className="crm-table-wrap">
      <table className="crm-table">
        <thead>
          <tr>
            <th>Prospect</th>
            <th>Contact</th>
            <th>Étape</th>
            <th>Dernière interaction</th>
            <th>Prochaine action</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((p) => {
            const last = formatLastContact(p);
            const { followUp } = getNextActionDisplay(p);
            const next =
              followUp.kind === "none"
                ? "—"
                : followUp.kind === "future" && followUp.dateLabel
                  ? followUp.dateLabel.replace("Prochaine relance : ", "")
                  : followUp.alert;
            return (
              <tr
                key={p.id}
                onClick={() => router.push(prospectDetailHref(p.id, listReturnUrl))}
              >
                <td>
                  <span className="font-medium text-wo-text">{p.club_name}</span>
                  {p.sport || p.ville ? (
                    <span className="mt-0.5 block text-[11px] text-wo-dim">
                      {[p.sport, p.ville || p.canton].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </td>
                <td>
                  <span className="text-wo-text">{p.contact_name || "—"}</span>
                  {p.contact_function ? (
                    <span className="mt-0.5 block text-[11px] text-wo-dim">{p.contact_function}</span>
                  ) : null}
                </td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td className="text-wo-muted">{last ? last.replace("Dernier contact : ", "") : "—"}</td>
                <td className={TEMPORAL[followUp.kind] ?? "text-wo-muted"}>{next}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <StatusSelect
                    value={p.status}
                    className="h-8 min-w-[9.5rem] rounded-lg border-wo-border bg-transparent px-2 py-0 text-xs"
                    onChange={(status) => onStatusChange(p.id, status)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
