"use client";

import { getFollowUpState } from "@/lib/crm/follow-up-state";
import { formatLastInteractionLine } from "@/lib/crm/activity-display";
import type { Prospect, ProspectActivity } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

const TEMPORAL = {
  today: "font-medium text-amber-700",
  overdue: "font-medium text-rose-600",
  future: "text-wo-text",
  none: "text-wo-muted",
} as const;

export function ProspectFollowUpCard({
  prospect,
  lastActivity,
  disabled,
  onFollowUpChange,
}: {
  prospect: Prospect;
  lastActivity: ProspectActivity | null;
  disabled?: boolean;
  onFollowUpChange: (value: string | null) => void;
}) {
  const followUp = getFollowUpState({
    status: prospect.status,
    next_follow_up: prospect.next_follow_up,
  });
  const closed = prospect.status === "Client" || prospect.status === "Fermé";

  return (
    <section className={`${ui.card} p-5 sm:p-6`}>
      <h2 className={ui.h2}>Suivi du prospect</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-wo-dim">Étape actuelle</p>
          <p className="mt-1.5 text-sm font-medium text-wo-text">{prospect.status}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-wo-dim">Dernière interaction</p>
          <p className="mt-1.5 text-sm text-wo-text">{formatLastInteractionLine(lastActivity)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-wo-dim">Prochaine action</p>
          {closed ? (
            <p className="mt-1.5 text-sm text-wo-muted">Aucune relance prévue</p>
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
