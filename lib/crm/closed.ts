/** Statuts terminaux — plus de relance automatique. */
export const CLOSED_PROSPECT_STATUSES = [
  "Client",
  "Pas maintenant",
  "Pas intéressé",
  "Perdu",
  "Refusé",
  "Refus",
] as const;

export function isClosedProspectStatus(status: string): boolean {
  return (CLOSED_PROSPECT_STATUSES as readonly string[]).includes(status);
}

/** Filtre PostgREST `.not("status", "in", ...)` */
export const CLOSED_STATUS_POSTGREST =
  '("Client","Pas maintenant","Pas intéressé","Perdu","Refusé","Refus")';

export const DEMO_SCHEDULED_STATUSES = ["Démo prévue", "Démonstration"] as const;
export const DEMO_DONE_STATUSES = ["Démo effectuée", "Démo faite"] as const;

export function isDemoScheduledStatus(status: string): boolean {
  return status === "Démo prévue" || status === "Démonstration";
}

export function isDemoDoneStatus(status: string): boolean {
  return status === "Démo effectuée" || status === "Démo faite";
}
