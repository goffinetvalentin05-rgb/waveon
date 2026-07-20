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

function followUpDate(days: number): string {
  return formatISO(addDays(new Date(), days), { representation: "date" });
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
  switch (action) {
    case "mail_sent": {
      if (currentStatus === "À contacter") {
        return {
          status: "Contacté",
          lastAction: "Mail envoyé",
          nextFollowUp: followUpDate(settings.delay_relance_1_days),
          activityTitle: "Premier mail envoyé",
          taskTitle: `Relancer ${clubName}`,
          taskKind: "follow_up",
        };
      }
      if (currentStatus === "Contacté") {
        return {
          status: "Relance 1",
          lastAction: "Relance mail",
          nextFollowUp: followUpDate(settings.delay_relance_2_days),
          activityTitle: "Relance 1 effectuée",
          taskTitle: `Relancer ${clubName}`,
          taskKind: "follow_up",
        };
      }
      if (currentStatus === "Relance 1") {
        return {
          status: "Relance 2",
          lastAction: "Relance mail 2",
          nextFollowUp: followUpDate(settings.delay_relance_3_days),
          activityTitle: "Relance 2 effectuée",
          taskTitle: `Relancer ${clubName}`,
          taskKind: "follow_up",
        };
      }
      return {
        status: currentStatus,
        lastAction: "Mail envoyé",
        nextFollowUp: followUpDate(settings.delay_relance_1_days),
        activityTitle: "Mail envoyé",
        taskTitle: `Relancer ${clubName}`,
        taskKind: "follow_up",
      };
    }
    case "call_made": {
      const nextStatus: ProspectStatus =
        currentStatus === "À contacter" ? "Contacté" : currentStatus;
      return {
        status: nextStatus === "Client" || nextStatus === "Refus" ? currentStatus : nextStatus,
        lastAction: "Appel effectué",
        nextFollowUp: followUpDate(settings.delay_relance_1_days),
        activityTitle: "Appel effectué",
        taskTitle: `Relancer ${clubName}`,
        taskKind: "follow_up",
      };
    }
    case "demo_scheduled":
      return {
        status: "Démonstration",
        lastAction: "Démo planifiée",
        nextFollowUp: followUpDate(settings.delay_relance_1_days),
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
