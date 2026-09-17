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

function nextActionLabel(prospect: Prospect): { text: string; kind: string } {
  const { followUp } = getNextActionDisplay(prospect);
  if (followUp.kind === "none") return { text: "Aucune action", kind: "none" };
  if (followUp.kind === "future" && followUp.dateLabel) {
    return {
      text: followUp.dateLabel.replace("Prochaine relance : ", ""),
      kind: followUp.kind,
    };
  }
  return { text: followUp.alert ?? "—", kind: followUp.kind };
}

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
    <>
      <div className="space-y-2 lg:hidden">
        {prospects.map((p) => {
          const next = nextActionLabel(p);
          const place = [p.sport, p.ville || p.canton].filter(Boolean).join(" · ");
          return (
            <button
              key={p.id}
              type="button"
              className="wo-card flex w-full flex-col gap-2.5 px-3.5 py-3 text-left"
              onClick={() => router.push(prospectDetailHref(p.id, listReturnUrl))}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold tracking-tight text-wo-text">
                    {p.club_name}
                  </span>
                  {place ? (
                    <span className="mt-0.5 block truncate text-[11.5px] text-wo-dim">{place}</span>
                  ) : null}
                </span>
                <StatusBadge status={p.status} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] pt-2.5">
                <span className={`min-w-0 truncate text-[12px] ${TEMPORAL[next.kind] ?? "text-wo-muted"}`}>
                  {next.text}
                </span>
                <span className="shrink-0 text-[11px] text-wo-dim">Ouvrir</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="crm-table-wrap hidden lg:block">
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
              const next = nextActionLabel(p);
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
                  <td className={TEMPORAL[next.kind] ?? "text-wo-muted"}>{next.text === "Aucune action" ? "—" : next.text}</td>
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
    </>
  );
}
