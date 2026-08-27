/** Statuts terminaux — plus de relance automatique. */
export const CLOSED_PROSPECT_STATUSES = [
  "Client",
  "Fermé",
  "Pas maintenant",
  "Pas intéressé",
  "Perdu",
  "Refusé",
  "Refus",
] as const;

export function isClosedProspectStatus(status: string): boolean {
  return (CLOSED_PROSPECT_STATUSES as readonly string[]).includes(status);
}

export function isLostProspectStatus(status: string): boolean {
  return status === "Fermé" || status === "Pas maintenant" || status === "Pas intéressé" || status === "Perdu" || status === "Refusé" || status === "Refus";
}

/** Filtre PostgREST `.not("status", "in", ...)` — inclut les alias historiques. */
export const CLOSED_STATUS_POSTGREST =
  '("Client","Fermé","Pas maintenant","Pas intéressé","Perdu","Refusé","Refus")';

export const DEMO_SCHEDULED_STATUSES = ["Démo", "Démo prévue", "Démonstration"] as const;
export const DEMO_DONE_STATUSES = ["Démo effectuée", "Démo faite"] as const;

export function isDemoStatus(status: string): boolean {
  return (
    status === "Démo" ||
    status === "Démo prévue" ||
    status === "Démonstration" ||
    status === "Démo à planifier" ||
    status === "Démo effectuée" ||
    status === "Démo faite" ||
    status === "À relancer après démo"
  );
}

export function isDemoScheduledStatus(status: string): boolean {
  return status === "Démo" || status === "Démo prévue" || status === "Démonstration";
}

export function isDemoDoneStatus(status: string): boolean {
  return status === "Démo effectuée" || status === "Démo faite";
}

export const CLOSED_REASONS = [
  "Pas intéressé",
  "Déjà équipé",
  "Pas le bon moment",
  "Mauvais contact",
  "Aucun retour après relances",
  "Autre",
] as const;

export type ClosedReason = (typeof CLOSED_REASONS)[number];

export function isClosedReason(value: string): value is ClosedReason {
  return (CLOSED_REASONS as readonly string[]).includes(value);
}

export function parseClosedReason(value: unknown): ClosedReason | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isClosedReason(trimmed) ? trimmed : null;
}

export function closedReasonFromLegacyStatus(status: string): ClosedReason | null {
  if (status === "Pas intéressé" || status === "Refusé" || status === "Refus") return "Pas intéressé";
  if (status === "Pas maintenant") return "Pas le bon moment";
  if (status === "Perdu") return "Autre";
  return null;
}

export function formatClosedReason(reason: string | null, note?: string | null): string | null {
  if (!reason) return null;
  if (reason === "Autre" && note?.trim()) return note.trim();
  return reason;
}
