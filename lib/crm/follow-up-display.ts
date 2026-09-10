import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { crmToday, parseDateOnly } from "@/lib/crm/date-only";
import { formatRelativeDay } from "@/lib/crm/format";
import { getFollowUpState, type FollowUpState } from "@/lib/crm/follow-up-state";
import type { Prospect } from "@/lib/crm/types";

export type FollowUpTemporalKind = FollowUpState["kind"];
export type FollowUpTemporalState = {
  kind: FollowUpTemporalKind;
  primary: string;
  secondary: string | null;
};

function toTemporal(state: FollowUpState): FollowUpTemporalState {
  return {
    kind: state.kind,
    primary: state.alert ?? "",
    secondary: null,
  };
}

/** État temporel basé uniquement sur la prochaine date de relance encore ouverte. */
export function getFollowUpTemporalState(
  nextFollowUp: string | null | undefined,
  today = crmToday(),
  status?: string | null
): FollowUpTemporalState {
  return toTemporal(getFollowUpState({ status, next_follow_up: nextFollowUp ?? null }, today));
}

export type NextActionDisplay = {
  temporal: FollowUpTemporalState;
  datedLabel: string | null;
  followUp: FollowUpState;
};

export function getNextActionDisplay(
  prospect: Pick<Prospect, "status" | "next_action" | "next_follow_up">
): NextActionDisplay {
  const followUp = getFollowUpState({
    status: prospect.status,
    next_follow_up: prospect.next_follow_up,
  });
  const temporal = toTemporal(followUp);

  let datedLabel: string | null = null;
  if (followUp.kind === "future" && followUp.dateLabel) {
    datedLabel = `Prochaine relance : ${followUp.dateLabel}`;
  } else if (followUp.kind === "none") {
    datedLabel = prospect.next_follow_up ? null : null;
  }

  return { temporal, datedLabel, followUp };
}

/** Dernier contact effectué (basé sur last_action_at) — jamais « Client contacté ». */
export function formatLastContact(prospect: Pick<Prospect, "last_action_at" | "last_action">): string | null {
  if (!prospect.last_action_at) return null;
  const relative = formatRelativeDay(prospect.last_action_at);
  if (relative === "Aujourd'hui") return "Dernier contact : aujourd'hui";
  if (relative === "Hier") return "Dernier contact : hier";
  if (relative.includes("jour") || relative === "Demain") {
    return `Dernier contact : ${relative}`;
  }
  try {
    const d = parseDateOnly(prospect.last_action_at);
    if (!Number.isNaN(d.getTime())) {
      return `Dernier contact : ${format(d, "d MMM", { locale: fr })}`;
    }
  } catch {
    /* ignore */
  }
  return `Dernier contact : ${relative}`;
}

/** Ligne compacte pour le Kanban : « Hier · Démo effectuée ». */
export function formatLastInteractionSummary(
  prospect: Pick<Prospect, "last_action_at" | "last_action">
): string | null {
  if (!prospect.last_action_at) return null;
  const when = formatRelativeDay(prospect.last_action_at);
  const action = prospect.last_action?.trim();
  if (action && !/^Statut/i.test(action)) {
    return `${when} · ${action}`;
  }
  return when;
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

export function formatSectorLocationLine(
  prospect: Pick<Prospect, "sport" | "ville" | "canton">
): string | null {
  const place = [prospect.ville, prospect.canton].filter(Boolean).join(", ");
  const parts = [prospect.sport, place].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
