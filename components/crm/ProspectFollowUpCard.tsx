"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getFollowUpState } from "@/lib/crm/follow-up-state";
import { formatLastInteractionLine } from "@/lib/crm/activity-display";
import { isDemoScheduledStatus } from "@/lib/crm/closed";
import { parseDateOnly } from "@/lib/crm/date-only";
import { isoToLocalTime } from "@/lib/crm/demo-schedule";
import { statusDisplayLabel } from "@/lib/crm/status";
import type { Prospect, ProspectActivity } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

const TEMPORAL = {
  today: "font-medium text-amber-700",
  overdue: "font-medium text-rose-600",
  future: "text-wo-text",
  none: "text-wo-muted",
} as const;

function formatActionDate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return format(parseDateOnly(value), "dd.MM.yyyy", { locale: fr });
  } catch {
    return value;
  }
}

export function ProspectFollowUpCard({
  prospect,
  lastActivity,
  disabled,
  onFollowUpChange,
  onEditDemo,
}: {
  prospect: Prospect;
  lastActivity: ProspectActivity | null;
  disabled?: boolean;
  onFollowUpChange: (value: string | null) => void;
  onEditDemo?: () => void;
}) {
  const followUp = getFollowUpState({
    status: prospect.status,
    next_follow_up: prospect.next_follow_up,
  });
  const closed = prospect.status === "Client" || prospect.status === "Fermé";
  const demoScheduled = isDemoScheduledStatus(prospect.status);
  const demoTime = prospect.demo_at ? isoToLocalTime(prospect.demo_at) : null;
  const nextLabel = prospect.next_action
    || (demoScheduled && demoTime ? `Démo planifiée · ${demoTime}` : null);

  return (
    <section className={`${ui.card} p-5 sm:p-6`}>
      <h2 className={ui.h2}>Suivi du prospect</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-wo-dim">Étape actuelle</p>
          <p className="mt-1.5 text-sm font-medium text-wo-text">{statusDisplayLabel(prospect.status)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-wo-dim">Dernière interaction</p>
          <p className="mt-1.5 text-sm text-wo-text">{formatLastInteractionLine(lastActivity)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-wo-dim">Prochaine action</p>
          {closed ? (
            <p className="mt-1.5 text-sm text-wo-muted">Aucune relance prévue</p>
          ) : demoScheduled ? (
            <>
              <p className="mt-1.5 text-sm font-medium text-wo-text">
                {formatActionDate(prospect.next_follow_up) ?? "—"}
              </p>
              {nextLabel ? <p className="mt-1 text-sm text-wo-text">{nextLabel}</p> : null}
              {followUp.kind === "today" || followUp.kind === "overdue" ? (
                <p className={`mt-1.5 text-xs ${TEMPORAL[followUp.kind]}`}>{followUp.alert}</p>
              ) : null}
              {onEditDemo && !disabled ? (
                <button type="button" className={`${ui.btnGhost} mt-2 px-0 text-sm`} onClick={onEditDemo}>
                  Modifier la démo
                </button>
              ) : null}
            </>
          ) : (
            <>
              <input
                type="date"
                className={`${ui.input} mt-1.5`}
                value={prospect.next_follow_up ?? ""}
                disabled={disabled}
                onChange={(e) => onFollowUpChange(e.target.value || null)}
              />
              {followUp.kind === "none" ? (
                <p className="mt-1.5 text-xs text-wo-muted">Aucune relance prévue</p>
              ) : (
                <p className={`mt-1.5 text-xs ${TEMPORAL[followUp.kind]}`}>{followUp.alert}</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
