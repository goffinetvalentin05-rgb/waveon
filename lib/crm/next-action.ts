import type { InteractionType, ProspectStatus } from "./types";
import { isClosedProspectStatus } from "./closed";

export const DEFAULT_NEXT_ACTION: Record<ProspectStatus, string | null> = {
  "À contacter": "Premier contact",
  "1er contact envoyé": "Envoyer relance 1",
  "Relance 1": "Envoyer relance 2",
  "Relance 2": "Envoyer relance 3 / dernière relance",
  "Relance 3 / dernière relance": "Décider : sans réponse ou recontacter plus tard",
  "Sans réponse": "Classer ou recontacter plus tard",
  "À recontacter plus tard": "Reprendre contact",
  "Réponse reçue": "Qualifier le besoin",
  "À qualifier": "Qualifier le besoin",
  Intéressé: "Planifier une démo",
  "Démo à planifier": "Proposer un créneau",
  "Démo prévue": "Préparer / confirmer la démo",
  "Démo effectuée": "Relancer après démo",
  "À relancer après démo": "Relancer après démo",
  "En réflexion": "Relancer",
  "Discussion avec comité / équipe": "Relancer le décideur",
  "Offre / prix envoyé": "Relancer l'offre",
  Client: null,
  "Pas maintenant": null,
  "Pas intéressé": null,
  Perdu: null,
};

const FOLLOW_UP_NEXT: Partial<Record<ProspectStatus, ProspectStatus>> = {
  "À contacter": "1er contact envoyé",
  "1er contact envoyé": "Relance 1",
  "Relance 1": "Relance 2",
  "Relance 2": "Relance 3 / dernière relance",
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

  if (type === "first_contact") {
    if (current === "À contacter") return "1er contact envoyé";
    return null;
  }

  if (type === "follow_up") {
    return FOLLOW_UP_NEXT[current] ?? null;
  }

  if (type === "reply" && ["À contacter", "1er contact envoyé", "Relance 1", "Relance 2", "Relance 3 / dernière relance", "Sans réponse"].includes(current)) {
    return "Réponse reçue";
  }

  if (type === "demo" && current === "Démo prévue") return "Démo effectuée";
  if (type === "offer" && !isClosedProspectStatus(current)) return "Offre / prix envoyé";

  return null;
}

export const CONTACT_ACTIVITY_TYPES = [
  "first_contact",
  "follow_up",
  "call",
  "whatsapp",
  "email",
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
