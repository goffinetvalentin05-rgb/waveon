import type { ProspectStatus } from "./types";

export const SMART_VIEWS = [
  { id: "all", label: "Tous" },
  { id: "to_contact", label: "À contacter" },
  { id: "today_work", label: "À relancer aujourd'hui" },
  { id: "overdue", label: "Relances en retard" },
  { id: "no_reply", label: "Sans réponse" },
  { id: "replied", label: "Réponses reçues" },
  { id: "demo_to_plan", label: "Démo à planifier" },
  { id: "demo_scheduled", label: "Démo prévue" },
  { id: "after_demo", label: "Après démo" },
  { id: "considering", label: "En réflexion" },
  { id: "offer_sent", label: "Offre envoyée" },
  { id: "clients", label: "Clients" },
  { id: "lost", label: "Perdus" },
] as const;

export type SmartViewId = (typeof SMART_VIEWS)[number]["id"];

export const SMART_VIEW_STATUSES: Partial<Record<SmartViewId, ProspectStatus[]>> = {
  to_contact: ["À contacter"],
  no_reply: ["Sans réponse"],
  replied: ["Réponse reçue"],
  demo_to_plan: ["Démo à planifier"],
  demo_scheduled: ["Démo prévue"],
  after_demo: ["À relancer après démo"],
  considering: ["En réflexion"],
  offer_sent: ["Offre / prix envoyé"],
  clients: ["Client"],
  lost: ["Pas maintenant", "Pas intéressé", "Perdu"],
};

export function isSmartViewId(value: string | null): value is SmartViewId {
  return SMART_VIEWS.some((v) => v.id === value);
}
