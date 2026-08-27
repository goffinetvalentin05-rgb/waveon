import type { InteractionType, ProspectStatus } from "./types";
import { isClosedProspectStatus } from "./closed";

export const DEFAULT_NEXT_ACTION: Record<ProspectStatus, string | null> = {
  "À contacter": "Premier contact",
  "Relance 1": "Envoyer relance 1",
  "Relance 2": "Envoyer relance 2",
  "En discussion": "Relancer",
  Démo: "Préparer / confirmer la démo",
  Client: null,
  Fermé: null,
};

const FOLLOW_UP_NEXT: Partial<Record<ProspectStatus, ProspectStatus>> = {
  "À contacter": "Relance 1",
  "Relance 1": "Relance 2",
};

export function defaultNextActionFor(status: ProspectStatus): string | null {
  return DEFAULT_NEXT_ACTION[status] ?? null;
}

/** Proposition de statut après une interaction — seulement si le passage est univoque. */
export function suggestedStatusAfterInteraction(
  type: InteractionType,
  current: ProspectStatus
): ProspectStatus | null {
  if (isClosedProspectStatus(current)) return null;

  if (type === "first_contact" && current === "À contacter") {
    return "Relance 1";
  }

  if (type === "follow_up") {
    return FOLLOW_UP_NEXT[current] ?? null;
  }

  // Une réponse ne déplace jamais le prospect : l'étape commerciale reste manuelle.
  if (type === "reply") return null;

  if (type === "demo" && current !== "Démo") return "Démo";

  return null;
}

export const CONTACT_ACTIVITY_TYPES = [
  "first_contact",
  "follow_up",
  "call",
  "whatsapp",
  "email",
  "linkedin",
  "mail_sent",
  "call_made",
  "meeting",
  "demo",
  "reply",
  "offer",
] as const;

export function isContactActivity(actionType: string): boolean {
  return (CONTACT_ACTIVITY_TYPES as readonly string[]).includes(actionType);
}
