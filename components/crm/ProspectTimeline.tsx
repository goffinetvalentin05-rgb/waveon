"use client";

import { useState } from "react";
import { IconDots, IconTrash } from "@tabler/icons-react";
import {
  commercialActivities,
  formatTimelineActivity,
  formatTimelineDate,
} from "@/lib/crm/activity-display";
import type { ProspectActivity } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

const PREVIEW = 5;

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
  const commercial = commercialActivities(activities);
  const visible = expanded ? commercial : commercial.slice(0, PREVIEW);
  const hiddenCount = Math.max(0, commercial.length - PREVIEW);

  return (
    <section className={`${ui.card} p-4 sm:p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={ui.h2}>Historique</h2>
        {canUndo ? (
          <button type="button" className={ui.btnGhost} disabled={pending} onClick={onUndoLast}>
            <IconTrash className="h-4 w-4" />
            Annuler la dernière action
          </button>
        ) : null}
      </div>

      {commercial.length === 0 ? (
        <p className="text-sm text-wo-dim">Aucune interaction pour le moment.</p>
      ) : (
        <ol className="space-y-0">
          {visible.map((a, idx) => {
            const view = formatTimelineActivity(a);
            const channel = a.channel?.trim();
            return (
              <li
                key={a.id}
                className="relative flex gap-4 pb-6 last:pb-0"
                onMouseLeave={() => setMenuId((v) => (v === a.id ? null : v))}
              >
                {idx < visible.length - 1 ? (
                  <span className="absolute left-[7px] top-3 h-full w-px bg-wo-hover" />
                ) : null}
                <span className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-wo-accent bg-[color:var(--wo-surface)]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-wo-dim">
                        {formatTimelineDate(a.occurred_at || a.created_at)}
                        {channel ? ` · ${channel}` : ""}
                      </p>
                      {view.title ? (
                        <p className="mt-0.5 text-sm font-medium text-wo-text">{view.title}</p>
                      ) : null}
                      {view.body ? (
                        <p className="mt-0.5 text-sm text-wo-muted whitespace-pre-wrap">{view.body}</p>
                      ) : null}
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        className="rounded-xl p-2 text-wo-dim hover:bg-wo-hover hover:text-wo-secondary"
                        onClick={() => setMenuId((v) => (v === a.id ? null : a.id))}
                        aria-label="Menu actions"
                      >
                        <IconDots className="h-4 w-4" />
                      </button>
                      {menuId === a.id ? (
                        <div className="absolute right-0 top-9 z-20 w-44 rounded-[12px] border border-wo-border bg-[color:var(--wo-modal)] p-2 shadow-lg">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
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
        <button
          type="button"
          className={`${ui.btnGhost} mt-2`}
          onClick={() => setExpanded(true)}
        >
          Voir tout l&apos;historique
        </button>
      ) : null}
    </section>
  );
}
