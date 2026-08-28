import { differenceInCalendarDays, format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { formatRelativeDay } from "@/lib/crm/format";
import type { Prospect, ProspectStatus } from "@/lib/crm/types";

function asDate(value: string) {
  return new Date(value.length === 10 ? `${value}T12:00:00` : value);
}

export type FollowUpTemporalKind = "none" | "future" | "today" | "overdue";

export type FollowUpTemporalState = {
  kind: FollowUpTemporalKind;
  primary: string;
  secondary: string | null;
};

function actionVerb(status: ProspectStatus, nextAction: string | null): string {
  if (nextAction) {
    const lower = nextAction.toLowerCase();
    if (lower.startsWith("relancer") || lower.startsWith("envoyer relance")) return "Relancer";
    if (lower.startsWith("premier contact")) return "Contacter";
    if (lower.includes("démo") || lower.includes("demo")) return "Démo";
    if (lower.includes("suivi réseau")) return "Suivi réseau";
    if (lower.startsWith("appeler")) return "Appeler";
    if (lower.startsWith("rdv")) return "RDV";
    return nextAction;
  }
  switch (status) {
    case "À contacter":
      return "Contacter";
    case "Relance 1":
    case "Relance 2":
    case "En discussion":
      return "Relancer";
    case "Relais":
      return "Suivi réseau";
    case "Démo":
      return "Démo";
    default:
      return "Action";
  }
}

function formatActionDate(value: string): string {
  const d = asDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "d MMM", { locale: fr });
}

/** État temporel basé uniquement sur la date de prochaine action (pas le statut pipeline). */
export function getFollowUpTemporalState(
  nextFollowUp: string | null | undefined,
  today = new Date().toISOString().slice(0, 10)
): FollowUpTemporalState {
  if (!nextFollowUp) {
    return { kind: "none", primary: "", secondary: null };
  }

  const d = asDate(nextFollowUp);
  if (Number.isNaN(d.getTime())) {
    return { kind: "none", primary: "", secondary: null };
  }

  if (nextFollowUp === today || isToday(d)) {
    return { kind: "today", primary: "À relancer aujourd'hui", secondary: null };
  }

  const delta = differenceInCalendarDays(d, asDate(today));
  if (delta < 0) {
    const days = Math.abs(delta);
    return {
      kind: "overdue",
      primary: `En retard de ${days} jour${days > 1 ? "s" : ""}`,
      secondary: null,
    };
  }

  const days = delta;
  return {
    kind: "future",
    primary: `dans ${days} jour${days > 1 ? "s" : ""}`,
    secondary: null,
  };
}

/** Libellé complet de la prochaine action avec date, ex. « Relancer le 2 sept. » */
export function formatNextActionWithDate(
  status: ProspectStatus,
  nextAction: string | null,
  nextFollowUp: string | null | undefined
): string | null {
  if (status === "Client" || status === "Fermé") return null;
  if (!nextFollowUp && !nextAction) return null;

  const verb = actionVerb(status, nextAction);
  if (nextFollowUp) {
    const dateLabel = formatActionDate(nextFollowUp);
    if (verb === "Relancer") return `Relancer le ${dateLabel}`;
    if (verb === "Contacter") return `Contacter le ${dateLabel}`;
    if (verb === "Suivi réseau") return `Suivi réseau le ${dateLabel}`;
    if (verb === "Démo") return `Démo le ${dateLabel}`;
    return `${verb} le ${dateLabel}`;
  }

  return nextAction;
}

export type NextActionDisplay = {
  temporal: FollowUpTemporalState;
  datedLabel: string | null;
};

export function getNextActionDisplay(prospect: Pick<Prospect, "status" | "next_action" | "next_follow_up">): NextActionDisplay {
  const temporal = getFollowUpTemporalState(prospect.next_follow_up);
  const datedLabel = formatNextActionWithDate(prospect.status, prospect.next_action, prospect.next_follow_up);
  return { temporal, datedLabel };
}

/** Dernier contact effectué (basé sur last_action_at). */
export function formatLastContact(prospect: Pick<Prospect, "last_action_at" | "last_action">): string | null {
  if (!prospect.last_action_at) return null;
  const relative = formatRelativeDay(prospect.last_action_at);
  if (relative === "Aujourd'hui") return "Contacté aujourd'hui";
  if (relative === "Hier") return "Contacté hier";
  if (prospect.last_action) {
    const short = formatRelativeDay(prospect.last_action_at);
    if (short.includes("jour") || short === "Demain") {
      return `Dernier contact : ${short}`;
    }
  }
  try {
    const d = asDate(prospect.last_action_at);
    if (!Number.isNaN(d.getTime())) {
      return `Dernier contact : ${format(d, "d MMM", { locale: fr })}`;
    }
  } catch {
    /* ignore */
  }
  return `Dernier contact : ${relative}`;
}

/** Ligne contact · fonction pour les cartes pipeline. */
export function formatContactLine(prospect: Pick<Prospect, "contact_name" | "contact_function">): string | null {
  const parts = [prospect.contact_name, prospect.contact_function].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Ligne localisation pour les cartes pipeline. */
export function formatLocationLine(prospect: Pick<Prospect, "ville" | "canton" | "country">): string | null {
  const parts = [prospect.ville, prospect.canton, prospect.country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
