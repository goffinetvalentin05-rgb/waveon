"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  PIPELINE_COLUMNS,
  groupProspectsByPipeline,
  isFollowedProspect,
  prospectAvatarTone,
} from "@/lib/crm/pipeline";
import { isDemoScheduledStatus } from "@/lib/crm/closed";
import type { Prospect } from "@/lib/crm/types";

function fmtDate(value: string | null) {
  if (!value) return null;
  try {
    return format(new Date(value.length === 10 ? `${value}T12:00:00` : value), "d MMM", {
      locale: fr,
    });
  } catch {
    return value;
  }
}

export function ProspectsPipeline({
  prospects,
  listReturnUrl,
}: {
  prospects: Prospect[];
  listReturnUrl: string;
}) {
  const router = useRouter();
  const groups = groupProspectsByPipeline(prospects);
  const followed = prospects.filter(isFollowedProspect).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#8b869c]">
        <span>
          <span className="font-semibold text-[#f3f0fa]">{followed}</span> prospects en suivi
        </span>
        <span className="text-white/20">·</span>
        <span>
          <span className="font-semibold text-[#f3f0fa]">{prospects.length}</span> au total
        </span>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {PIPELINE_COLUMNS.map((col) => {
          const items = groups[col.id];
          return (
            <div
              key={col.id}
              className="flex w-[260px] shrink-0 flex-col rounded-[14px] border border-white/[0.06] bg-[#100e16]"
            >
              <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${col.accent}`} />
                  <h3 className="text-[13px] font-medium text-[#f3f0fa]">{col.label}</h3>
                </div>
                <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[#8b869c]">
                  {items.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2">
                {items.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-[#6a6578]">Vide</p>
                ) : (
                  items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const back = encodeURIComponent(listReturnUrl);
                        router.push(`/crm/prospects/${p.id}?back=${back}`);
                      }}
                      className="flex items-center gap-2.5 rounded-[12px] border border-white/[0.04] bg-[#14121c] px-2.5 py-2.5 text-left transition hover:border-white/[0.1] hover:bg-[#1a1824]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#f3f0fa]">{p.club_name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[#6a6578]">
                          {[p.ville, p.sport].filter(Boolean).join(" · ") || p.status}
                          {p.next_follow_up ? ` · ${fmtDate(p.next_follow_up)}` : ""}
                        </p>
                      </div>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${prospectAvatarTone(p.club_name)}`}
                      >
                        {p.club_name.charAt(0).toUpperCase()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PipelineStats({ prospects, conversionRate }: { prospects: Prospect[]; conversionRate?: number }) {
  const followed = prospects.filter(isFollowedProspect).length;
  const meetings = prospects.filter((p) => isDemoScheduledStatus(p.status) || p.status === "Démo faite").length;
  const clients = prospects.filter((p) => p.status === "Client").length;
  const rate =
    conversionRate ??
    (prospects.length ? Math.round((clients / prospects.length) * 100) : 0);

  const cards = [
    { label: "En suivi", value: String(followed) },
    { label: "RDV / démos", value: String(meetings) },
    { label: "Clients", value: String(clients) },
    { label: "Taux de conv.", value: `${rate}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-[12px] border border-white/[0.07] border-t-2 border-t-violet-500/70 bg-[#14121c] px-3.5 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8b869c]">{c.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-[#f3f0fa]">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
