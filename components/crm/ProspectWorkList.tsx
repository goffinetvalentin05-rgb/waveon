"use client";

import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { StatusSelect } from "@/components/crm/StatusSelect";
import { formatRelativeDay } from "@/lib/crm/format";
import type { Prospect, ProspectStatus } from "@/lib/crm/types";

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

  return (
    <article
      className="cursor-pointer rounded-[1.15rem] border border-wo-border bg-[#101010] px-4 py-3.5 transition hover:border-white/[0.12]"
      onClick={() => {
        const back = encodeURIComponent(listReturnUrl);
        router.push(`/crm/prospects/${prospect.id}?back=${back}`);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-wo-text">{prospect.club_name}</h3>
          <p className="mt-0.5 truncate text-xs text-wo-dim">
            {[prospect.contact_name, prospect.ville || prospect.canton].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            value={prospect.status}
            className="h-8 min-w-[10.5rem] rounded-full border-wo-border bg-[#0a0a0a] px-2.5 py-0 text-xs"
            onChange={(status) => onStatusChange(prospect.id, status)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-wo-muted">
        <StatusBadge status={prospect.status} />
        <span>{prospect.contact_channel || "Canal —"}</span>
        <span>Dernier contact : {formatRelativeDay(prospect.last_action_at)}</span>
        {prospect.contact_count != null ? (
          <span>
            {prospect.contact_count} contact{prospect.contact_count > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        <span className="text-wo-text">{prospect.next_action || "Pas de prochaine action"}</span>
        <span className="text-wo-muted">{formatRelativeDay(prospect.next_follow_up)}</span>
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
