import { formatISO } from "date-fns";
import type { CrmSettings, ProspectStatus, QuickAction } from "./types";
import { isClosedProspectStatus } from "./closed";

export type ActionResult = {
  status: ProspectStatus;
  lastAction: string;
  nextFollowUp: string | null;
  activityTitle: string;
  taskTitle: string | null;
  taskKind: "follow_up" | "first_contact" | "demo" | null;
};

function dateOnly(d: Date): string {
  return formatISO(d, { representation: "date" });
}

/** Applique une action rapide et calcule le prochain statut + relance. */
export function resolveQuickAction(
  action: QuickAction,
  currentStatus: ProspectStatus,
  settings: Pick<
    CrmSettings,
    "delay_relance_1_days" | "delay_relance_2_days" | "delay_relance_3_days"
  >,
  clubName: string
): ActionResult {
  return resolveQuickActionAt(action, currentStatus, settings, clubName, new Date());
}

export function resolveQuickActionAt(
  action: QuickAction,
  currentStatus: ProspectStatus,
  _settings: Pick<
    CrmSettings,
    "delay_relance_1_days" | "delay_relance_2_days" | "delay_relance_3_days"
  >,
  _clubName: string,
  actionDate: Date,
  demoAt?: Date | null
): ActionResult {
  if (isClosedProspectStatus(currentStatus)) {
    if (action === "client") {
      return {
        status: "Client",
        lastAction: "Devenu client",
        nextFollowUp: null,
        activityTitle: "Signé — client",
        taskTitle: null,
        taskKind: null,
      };
    }
    if (action === "refus") {
      return {
        status: "Fermé",
        lastAction: "Fermé",
        nextFollowUp: null,
        activityTitle: "Prospect fermé",
        taskTitle: null,
        taskKind: null,
      };
    }
    return {
      status: currentStatus,
      lastAction: "Action enregistrée",
      nextFollowUp: null,
      activityTitle: "Action",
      taskTitle: null,
      taskKind: null,
    };
  }

  switch (action) {
    case "mail_sent": {
      const nextStatus: ProspectStatus = currentStatus === "À contacter" ? "Relance 1" : currentStatus;
      return {
        status: nextStatus,
        lastAction: currentStatus === "À contacter" ? "Premier contact envoyé" : "Email envoyé",
        nextFollowUp: null,
        activityTitle: currentStatus === "À contacter" ? "Premier contact envoyé" : "Email envoyé",
        taskTitle: null,
        taskKind: null,
      };
    }
    case "call_made": {
      const nextStatus: ProspectStatus = currentStatus === "À contacter" ? "Relance 1" : currentStatus;
      return {
        status: nextStatus,
        lastAction: currentStatus === "À contacter" ? "Premier appel effectué" : "Appel effectué",
        nextFollowUp: null,
        activityTitle: currentStatus === "À contacter" ? "Premier appel effectué" : "Appel effectué",
        taskTitle: null,
        taskKind: null,
      };
    }
    case "demo_scheduled":
      return {
        status: "Démo",
        lastAction: "Démo planifiée",
        nextFollowUp: dateOnly(demoAt ?? actionDate),
        activityTitle: "Démonstration planifiée",
        taskTitle: `Démonstration ${_clubName}`,
        taskKind: "demo",
      };
    case "demo_done": {
      const nextStatus: ProspectStatus = isClosedProspectStatus(currentStatus)
        ? currentStatus
        : "Décision en attente";
      return {
        status: nextStatus,
        lastAction: "Démo effectuée",
        nextFollowUp: null,
        activityTitle: "Démo effectuée",
        taskTitle: null,
        taskKind: null,
      };
    }
    case "client":
      return {
        status: "Client",
        lastAction: "Devenu client",
        nextFollowUp: null,
        activityTitle: "Signé — client",
        taskTitle: null,
        taskKind: null,
      };
    case "refus":
      return {
        status: "Fermé",
        lastAction: "Fermé",
        nextFollowUp: null,
        activityTitle: "Prospect fermé",
        taskTitle: null,
        taskKind: null,
      };
  }
}

export const QUICK_ACTION_LABELS: Record<QuickAction, string> = {
  mail_sent: "Mail envoyé",
  call_made: "Appel effectué",
  demo_scheduled: "Démonstration planifiée",
  demo_done: "Démo effectuée",
  client: "Passer en client",
  refus: "Perdu",
};
