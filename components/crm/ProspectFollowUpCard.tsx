"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ReactNode } from "react";
import { getFollowUpState } from "@/lib/crm/follow-up-state";
import { formatLastInteractionLine } from "@/lib/crm/activity-display";
import { isDemoScheduledStatus } from "@/lib/crm/closed";
import { parseDateOnly } from "@/lib/crm/date-only";
import {
  DEMO_REMINDER_NEXT_ACTION,
  isDemoReminderNextAction,
  isoToLocalDate,
  isoToLocalTime,
} from "@/lib/crm/demo-schedule";
import { statusDisplayLabel } from "@/lib/crm/status";
import { formatChf } from "@/lib/crm/dashboard";
import type { Prospect, ProspectActivity } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

const TEMPORAL = {
  today: "text-amber-300",
  overdue: "text-rose-300",
  future: "text-wo-text",
  none: "text-wo-muted",
} as const;

function formatActionDate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return format(parseDateOnly(value), "d MMM yyyy", { locale: fr });
  } catch {
    return value;
  }
}

function Stat({
  label,
  value,
  hint,
  hintClass,
  children,
  className,
}: {
  label: string;
  value?: string;
  hint?: string | null;
  hintClass?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`wo-detail-stat ${className ?? ""}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-wo-dim">{label}</p>
      {children ?? (
        <p className="mt-2 truncate text-[14.5px] font-medium tracking-tight text-wo-text">{value}</p>
      )}
      {hint ? <p className={`mt-1 text-[11.5px] ${hintClass ?? "text-wo-dim"}`}>{hint}</p> : null}
    </div>
  );
}

export function ProspectFollowUpCard({
  prospect,
  lastActivity,
  contactCount,
  disabled,
  onFollowUpChange,
  onEditDemo,
}: {
  prospect: Prospect;
  lastActivity: ProspectActivity | null;
  contactCount?: number;
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
  const demoDate = prospect.demo_at ? isoToLocalDate(prospect.demo_at) : null;
  const nextLabel = (() => {
    if (isDemoReminderNextAction(prospect.next_action)) return prospect.next_action;
    if (prospect.next_action?.startsWith("Démo planifiée")) return prospect.next_action;
    if (demoDate && prospect.next_follow_up && prospect.next_follow_up < demoDate) {
      return DEMO_REMINDER_NEXT_ACTION;
    }
    if (demoScheduled && demoTime) return `Démo planifiée · ${demoTime}`;
    return prospect.next_action;
  })();

  const nextValue = closed
    ? "Aucune relance"
    : formatActionDate(prospect.next_follow_up) ?? (nextLabel || "À planifier");

  return (
    <section className="wo-hero p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="wo-kicker">Synthèse</p>
          <h2 className={`${ui.h2} mt-1.5 text-[16px] lg:text-[17px]`}>Où en est ce prospect</h2>
        </div>
        {demoScheduled && onEditDemo && !disabled ? (
          <button type="button" className={ui.btnGhost} onClick={onEditDemo}>
            Modifier la démo
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:mt-5 lg:grid-cols-4 lg:gap-2.5">
        <Stat label="Étape" value={statusDisplayLabel(prospect.status)} />
        <Stat
          label="Prochaine action"
          value={nextValue}
          hint={!closed ? followUp.alert : null}
          hintClass={TEMPORAL[followUp.kind]}
        >
          {closed || demoScheduled ? (
            <p className="mt-2 text-[14.5px] font-medium tracking-tight text-wo-text">
              {nextValue}
              {demoScheduled && nextLabel && nextLabel !== nextValue ? (
                <span className="mt-1 block text-[12px] font-normal text-wo-muted">{nextLabel}</span>
              ) : null}
            </p>
          ) : (
            <input
              id="prospect-followup-date"
              type="date"
              className={`${ui.input} mt-2`}
              value={prospect.next_follow_up ?? ""}
              disabled={disabled}
              onChange={(e) => onFollowUpChange(e.target.value || null)}
            />
          )}
        </Stat>
        <Stat label="Dernière interaction" value={formatLastInteractionLine(lastActivity)} />
        <Stat label="Priorité" value={prospect.priority ?? "Normale"} className="hidden lg:block" />
        {prospect.assignee?.name ? <Stat label="Responsable" value={prospect.assignee.name} className="hidden lg:block" /> : null}
        {prospect.contact_channel ? <Stat label="Canal" value={prospect.contact_channel} className="hidden lg:block" /> : null}
        <Stat
          label="Contacts"
          value={`${contactCount ?? prospect.contact_count ?? 0}`}
          hint="personnes rattachées"
        />
        {prospect.potential_value ? (
          <Stat label="Potentiel" value={formatChf(Number(prospect.potential_value))} className="hidden lg:block" />
        ) : null}
      </div>
    </section>
  );
}
