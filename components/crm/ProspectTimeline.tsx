"use client";

import { useState } from "react";
import {
  IconCalendarEvent,
  IconDots,
  IconMail,
  IconMessage,
  IconNote,
  IconPhone,
  IconPlus,
  IconSwitchHorizontal,
  IconTrash,
  IconUser,
  IconUserCheck,
  IconUsers,
  IconUserX,
} from "@tabler/icons-react";
import {
  commercialActivities,
  formatTimelineActivity,
  formatTimelineDate,
} from "@/lib/crm/activity-display";
import type { ProspectActivity } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

const PREVIEW = 6;

function activityIcon(type: string) {
  if (type === "mail_sent" || type === "email") return IconMail;
  if (type === "call_made" || type === "call") return IconPhone;
  if (type === "message" || type === "whatsapp" || type === "linkedin") return IconMessage;
  if (type === "note") return IconNote;
  if (type === "meeting") return IconUsers;
  if (type === "demo_scheduled" || type === "demo" || type === "demo_done") return IconCalendarEvent;
  if (type === "status_change") return IconSwitchHorizontal;
  if (type === "client") return IconUserCheck;
  if (type === "refus") return IconUserX;
  if (type === "created" || type === "imported") return IconPlus;
  return IconUser;
}

export function ProspectTimeline({
  activities,
  canUndo,
  pending,
  onUndoLast,
  onDelete,
}: {
  activities: ProspectActivity[];
  canUndo: boolean;
  pending?: boolean;
  onUndoLast: () => void;
  onDelete: (activity: ProspectActivity) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const extraIds = new Set(
    activities
      .filter((a) => a.action_type === "status_change" || a.action_type === "created" || a.action_type === "imported")
      .map((a) => a.id)
  );
  const timeline = activities.filter(
    (a) => extraIds.has(a.id) || commercialActivities([a]).length > 0
  );
  const visible = expanded ? timeline : timeline.slice(0, PREVIEW);
  const hiddenCount = Math.max(0, timeline.length - PREVIEW);

  return (
    <section className={`${ui.card} p-4 lg:p-6`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className={ui.h2}>Historique</h2>
          <p className="mt-0.5 text-[12.5px] text-wo-muted">Toute l’activité commerciale sur ce prospect.</p>
        </div>
        {canUndo ? (
          <button type="button" className={ui.btnGhost} disabled={pending} onClick={onUndoLast}>
            Annuler la dernière action
          </button>
        ) : null}
      </div>

      {timeline.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-10 text-center">
          <p className="text-sm text-wo-muted">Aucune interaction pour le moment.</p>
        </div>
      ) : (
        <ol className="space-y-0">
          {visible.map((a, idx) => {
            const view = formatTimelineActivity(a);
            const channel = a.channel?.trim();
            const Icon = activityIcon(a.action_type);
            return (
              <li
                key={a.id}
                className="relative flex gap-3.5 pb-5 last:pb-0"
                onMouseLeave={() => setMenuId((v) => (v === a.id ? null : v))}
              >
                {idx < visible.length - 1 ? (
                  <span className="absolute left-[15px] top-9 h-[calc(100%-12px)] w-px bg-white/[0.07]" />
                ) : null}
                <span className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-wo-accent/25 bg-[#15110e] text-[#f3a35c] shadow-[0_0_12px_rgba(217,119,50,0.18)]">
                  <Icon className="h-3.5 w-3.5" stroke={1.8} />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.05] bg-white/[0.025] px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-wo-dim">
                        {formatTimelineDate(a.occurred_at || a.created_at)}
                        {channel ? ` · ${channel}` : ""}
                      </p>
                      {view.title ? (
                        <p className="mt-1 text-[13.5px] font-medium text-wo-text">{view.title}</p>
                      ) : null}
                      {view.body ? (
                        <p className="mt-1 text-[13px] leading-relaxed text-wo-muted whitespace-pre-wrap">{view.body}</p>
                      ) : null}
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        className="rounded-xl p-1.5 text-wo-dim hover:bg-wo-hover hover:text-wo-secondary"
                        onClick={() => setMenuId((v) => (v === a.id ? null : a.id))}
                        aria-label="Menu actions"
                      >
                        <IconDots className="h-4 w-4" />
                      </button>
                      {menuId === a.id ? (
                        <div className="absolute right-0 top-8 z-20 w-44 rounded-[12px] border border-wo-border bg-[color:var(--wo-modal)] p-2 shadow-lg">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                            onClick={() => {
                              setMenuId(null);
                              onDelete(a);
                            }}
                          >
                            <IconTrash className="h-4 w-4" />
                            Supprimer
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {hiddenCount > 0 && !expanded ? (
        <button type="button" className={`${ui.btnGhost} mt-3`} onClick={() => setExpanded(true)}>
          Voir tout l&apos;historique
        </button>
      ) : null}
    </section>
  );
}
