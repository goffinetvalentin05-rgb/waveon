import type { ProspectStatus } from "./types";

export const SMART_VIEWS = [
  { id: "all", label: "Tous", pin: true },
  { id: "today_work", label: "À relancer aujourd'hui", pin: true },
  { id: "overdue", label: "Relances en retard", pin: true },
  { id: "lost", label: "Fermés", pin: true },
  { id: "to_contact", label: "À contacter", pin: false },
  { id: "no_reply", label: "Sans réponse", pin: false },
  { id: "replied", label: "Réponses reçues", pin: false },
  { id: "demo_to_plan", label: "Démo à planifier", pin: false },
  { id: "demo_scheduled", label: "Démo prévue", pin: false },
  { id: "after_demo", label: "Après démo", pin: false },
  { id: "considering", label: "En discussion", pin: false },
  { id: "offer_sent", label: "Offre envoyée", pin: false },
  { id: "clients", label: "Clients", pin: false },
] as const;

export type SmartViewId = (typeof SMART_VIEWS)[number]["id"];

export const SMART_VIEW_STATUSES: Partial<Record<SmartViewId, ProspectStatus[]>> = {
  to_contact: ["À contacter"],
  considering: ["En discussion"],
  demo_to_plan: ["Démo"],
  demo_scheduled: ["Démo"],
  after_demo: ["Démo"],
  clients: ["Client"],
  lost: ["Fermé"],
};

export function isSmartViewId(value: string | null): value is SmartViewId {
  return SMART_VIEWS.some((v) => v.id === value);
}
