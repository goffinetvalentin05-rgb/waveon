"use client";

import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { StatusSelect } from "@/components/crm/StatusSelect";
import {
  formatLastContact,
  getNextActionDisplay,
} from "@/lib/crm/follow-up-display";
import { formatRelayFollowUp } from "@/lib/crm/format";
import { prospectDetailHref } from "@/lib/crm/paths";
import { formatClosedReason } from "@/lib/crm/closed";
import type { Prospect, ProspectStatus } from "@/lib/crm/types";

const TEMPORAL_STYLES = {
  future: "text-wo-muted",
  today: "font-medium text-amber-700",
  overdue: "font-medium text-rose-600",
  none: "text-wo-dim",
} as const;

export function ProspectListRow({
  prospect,
  listReturnUrl,
  onStatusChange,
}: {
  prospect: Prospect;
  listReturnUrl: string;
  onStatusChange: (id: string, status: ProspectStatus) => void;
}) {
  const router = useRouter();
  const lastContact = formatLastContact(prospect);

  return (
    <article
      className="cursor-pointer rounded-[1.15rem] border border-wo-border bg-white px-4 py-3.5 transition hover:border-indigo-200 hover:bg-slate-50/70"
      onClick={() => {
        router.push(prospectDetailHref(prospect.id, listReturnUrl));
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-wo-text">{prospect.club_name}</h3>
          <p className="mt-0.5 truncate text-xs text-wo-dim">
            {prospect.status === "Fermé"
              ? formatClosedReason(prospect.closed_reason, prospect.closed_note) || "Fermé"
              : [prospect.contact_name, prospect.ville || prospect.canton].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            value={prospect.status}
            className="h-8 min-w-[10.5rem] rounded-full border-wo-border bg-white px-2.5 py-0 text-xs"
            onChange={(status) => onStatusChange(prospect.id, status)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-wo-muted">
        <StatusBadge status={prospect.status} />
        <span>{prospect.contact_channel || "Canal —"}</span>
        {lastContact ? <span>{lastContact}</span> : <span>Dernier contact : —</span>}
        {prospect.people_count != null ? (
          <span>
            {prospect.people_count} personne{prospect.people_count > 1 ? "s" : ""}
          </span>
        ) : prospect.contact_count != null ? (
          <span>
            {prospect.contact_count} contact{prospect.contact_count > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        {prospect.status === "Relais" ? (
          <span className="text-wo-text">{formatRelayFollowUp(prospect.next_follow_up)}</span>
        ) : (
          (() => {
            const { temporal, datedLabel } = getNextActionDisplay(prospect);
            if (!datedLabel && temporal.kind === "none") {
              return <span className="text-wo-dim">Pas de prochaine action</span>;
            }
            return (
              <>
                {datedLabel ? <span className="text-wo-text">{datedLabel}</span> : null}
                {temporal.kind !== "none" ? (
                  <span className={TEMPORAL_STYLES[temporal.kind]}>{temporal.primary}</span>
                ) : null}
              </>
            );
          })()
        )}
        {prospect.assignee?.name ? <span className="text-wo-dim">{prospect.assignee.name}</span> : null}
      </div>
    </article>
  );
}

export function ProspectWorkSections({
  prospects,
  listReturnUrl,
  onStatusChange,
}: {
  prospects: Prospect[];
  listReturnUrl: string;
  onStatusChange: (id: string, status: ProspectStatus) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const todayList = prospects.filter((p) => p.next_follow_up === today);
  const overdue = prospects.filter((p) => p.next_follow_up && p.next_follow_up < today);

  return (
    <div className="space-y-7">
      <section>
        <h2 className="mb-3 text-sm font-medium text-wo-text">À relancer aujourd&apos;hui</h2>
        {todayList.length === 0 ? (
          <p className="text-sm text-wo-dim">Rien pour aujourd&apos;hui.</p>
        ) : (
          <div className="space-y-2">
            {todayList.map((p) => (
              <ProspectListRow
                key={p.id}
                prospect={p}
                listReturnUrl={listReturnUrl}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-wo-text">En retard</h2>
        {overdue.length === 0 ? (
          <p className="text-sm text-wo-dim">Aucune relance en retard.</p>
        ) : (
          <div className="space-y-2">
            {overdue.map((p) => (
              <ProspectListRow
                key={p.id}
                prospect={p}
                listReturnUrl={listReturnUrl}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
