import { differenceInCalendarDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { isClosedProspectStatus } from "@/lib/crm/closed";
import { crmToday, parseDateOnly } from "@/lib/crm/date-only";
import { migrateProspectStatus } from "@/lib/crm/status";
import type { Prospect } from "@/lib/crm/types";

export type FollowUpKind = "none" | "today" | "future" | "overdue";

export type FollowUpState = {
  kind: FollowUpKind;
  days: number | null;
  /** Libellé d'alerte : aujourd'hui / en retard / dans X jours. Null si aucune relance. */
  alert: string | null;
  /** Date courte, ex. « 17 sept. » */
  dateLabel: string | null;
};

export type FollowUpInput = {
  status: string | null | undefined;
  next_follow_up?: string | null;
  nextFollowUp?: string | null;
};

function followUpDate(input: FollowUpInput): string | null {
  const raw = input.next_follow_up ?? input.nextFollowUp ?? null;
  if (!raw) return null;
  const value = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function isProspectFollowUpTracked(status: string | null | undefined): boolean {
  if (!status) return true;
  return !isClosedProspectStatus(migrateProspectStatus(status));
}

function formatShortFollowUpDate(value: string): string {
  const d = parseDateOnly(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "d MMM", { locale: fr });
}

/**
 * État de la prochaine relance.
 * Source unique : `next_follow_up` encore ouverte. Les clients / fermés n'ont jamais d'alerte.
 */
export function getFollowUpState(input: FollowUpInput, today = crmToday()): FollowUpState {
  if (!isProspectFollowUpTracked(input.status)) {
    return { kind: "none", days: null, alert: null, dateLabel: null };
  }

  const next = followUpDate(input);
  if (!next) {
    return { kind: "none", days: null, alert: null, dateLabel: null };
  }

  const dateLabel = formatShortFollowUpDate(next);
  const delta = differenceInCalendarDays(parseDateOnly(next), parseDateOnly(today));

  if (delta === 0) {
    return { kind: "today", days: 0, alert: "À relancer aujourd'hui", dateLabel };
  }

  if (delta < 0) {
    const days = Math.abs(delta);
    return {
      kind: "overdue",
      days,
      alert: `En retard de ${days} jour${days > 1 ? "s" : ""}`,
      dateLabel,
    };
  }

  return {
    kind: "future",
    days: delta,
    alert: `dans ${delta} jour${delta > 1 ? "s" : ""}`,
    dateLabel,
  };
}

export function getProspectFollowUpState(
  prospect: Pick<Prospect, "status" | "next_follow_up">,
  today = crmToday()
): FollowUpState {
  return getFollowUpState({ status: prospect.status, next_follow_up: prospect.next_follow_up }, today);
}

/** Après une interaction : l'échéance en cours est traitée. */
export function clearTreatedFollowUp(nextFollowUp: string | null | undefined): null {
  void nextFollowUp;
  return null;
}
