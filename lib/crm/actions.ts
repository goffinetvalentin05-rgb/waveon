import { addDays, formatISO } from "date-fns";
import type { CrmSettings, ProspectStatus, QuickAction } from "./types";

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

function followUpDateFrom(base: Date, days: number): string {
  return dateOnly(addDays(base, days));
}

function isTerminalStatus(status: ProspectStatus) {
  return status === "Client" || status === "Refus" || status === "Pas intéressé";
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
  settings: Pick<
    CrmSettings,
    "delay_relance_1_days" | "delay_relance_2_days" | "delay_relance_3_days"
  >,
  clubName: string,
  actionDate: Date,
  demoAt?: Date | null
): ActionResult {
  // Sécurité : une fois terminal, on ne planifie plus de relance.
  if (isTerminalStatus(currentStatus)) {
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
        status: "Refus",
        lastAction: "Refus",
        nextFollowUp: null,
        activityTitle: "Refus enregistré",
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
      if (currentStatus === "À contacter") {
        return {
          status: "Contacté",
          lastAction: "Mail envoyé",
          nextFollowUp: followUpDateFrom(actionDate, settings.delay_relance_1_days),
          activityTitle: "Premier mail envoyé",
          taskTitle: `Relancer ${clubName}`,
          taskKind: "follow_up",
        };
      }
      if (currentStatus === "Contacté") {
        return {
          status: "Relance 1",
          lastAction: "Relance mail",
          nextFollowUp: followUpDateFrom(actionDate, settings.delay_relance_2_days),
          activityTitle: "Relance 1 effectuée",
          taskTitle: `Relancer ${clubName}`,
          taskKind: "follow_up",
        };
      }
      if (currentStatus === "Relance 1") {
        return {
          status: "Relance 2",
          lastAction: "Relance mail 2",
          nextFollowUp: followUpDateFrom(actionDate, settings.delay_relance_3_days),
          activityTitle: "Relance 2 effectuée",
          taskTitle: `Relancer ${clubName}`,
          taskKind: "follow_up",
        };
      }
      return {
        status: currentStatus,
        lastAction: "Mail envoyé",
        nextFollowUp: followUpDateFrom(actionDate, settings.delay_relance_1_days),
        activityTitle: "Mail envoyé",
        taskTitle: `Relancer ${clubName}`,
        taskKind: "follow_up",
      };
    }
    case "call_made": {
      const nextStatus: ProspectStatus =
        currentStatus === "À contacter" ? "Contacté" : currentStatus;
      return {
        status: nextStatus,
        lastAction: "Appel effectué",
        nextFollowUp: followUpDateFrom(actionDate, settings.delay_relance_1_days),
        activityTitle: "Appel effectué",
        taskTitle: `Relancer ${clubName}`,
        taskKind: "follow_up",
      };
    }
    case "demo_scheduled":
      // Pour une démo, on utilise la date prévue (demoAt) comme prochaine échéance.
      // Si elle n'est pas fournie, on retombe sur la date de l'action.
      return {
        status: "Démonstration",
        lastAction: "Démo planifiée",
        nextFollowUp: dateOnly(demoAt ?? actionDate),
        activityTitle: "Démonstration planifiée",
        taskTitle: `Démonstration ${clubName}`,
        taskKind: "demo",
      };
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
        status: "Refus",
        lastAction: "Refus",
        nextFollowUp: null,
        activityTitle: "Refus enregistré",
        taskTitle: null,
        taskKind: null,
      };
  }
}

export const QUICK_ACTION_LABELS: Record<QuickAction, string> = {
  mail_sent: "Mail envoyé",
  call_made: "Appel effectué",
  demo_scheduled: "Démonstration planifiée",
  client: "Client",
  refus: "Refus",
};
