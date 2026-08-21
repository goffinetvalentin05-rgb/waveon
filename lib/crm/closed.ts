/** Statuts de pipeline CRM WaveOne. */
export const CLOSED_PROSPECT_STATUSES = ["Client", "Refusé", "Refus", "Pas intéressé"] as const;

export function isClosedProspectStatus(status: string): boolean {
  return (CLOSED_PROSPECT_STATUSES as readonly string[]).includes(status);
}

/** Filtre PostgREST `.not("status", "in", ...)` */
export const CLOSED_STATUS_POSTGREST = '("Client","Refusé","Refus","Pas intéressé")';

export const DEMO_SCHEDULED_STATUSES = ["Démo prévue", "Démonstration"] as const;
export const DEMO_DONE_STATUSES = ["Démo faite"] as const;

export function isDemoScheduledStatus(status: string): boolean {
  return status === "Démo prévue" || status === "Démonstration";
}
