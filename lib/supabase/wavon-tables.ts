/**
 * Noms des tables métier `public.*`.
 *
 * - Par défaut : préfixe **`wavon_`** (migrations du dépôt).
 * - Production (tables renommées) : définir **`NEXT_PUBLIC_WAEVON_DB_TABLE_PREFIX=waevon`**
 *   sur Vercel (rebuild), ou **`WAEVON_DB_TABLE_PREFIX=waevon`** côté serveur uniquement.
 *
 * La marque s’écrit « Waevon » ; le préfixe SQL peut être `wavon` ou `waevon` selon le projet Supabase.
 */
export type WavonSqlTablePrefix = "wavon" | "waevon";

function resolveTablePrefix(): WavonSqlTablePrefix {
  if (typeof process === "undefined") return "wavon";
  const v = (
    process.env.NEXT_PUBLIC_WAEVON_DB_TABLE_PREFIX?.trim() ||
    process.env.WAEVON_DB_TABLE_PREFIX?.trim() ||
    ""
  ).toLowerCase();
  return v === "waevon" ? "waevon" : "wavon";
}

const P = resolveTablePrefix();

export function getWavonDbTablePrefix(): WavonSqlTablePrefix {
  return P;
}

/** Tables avec le préfixe métier (`${prefix}_…`). `blocked_slots` reste sans préfixe historique. */
export const WavonDbTable = {
  businesses: `${P}_businesses`,
  settings: `${P}_settings`,
  services: `${P}_services`,
  clients: `${P}_clients`,
  reservations: `${P}_reservations`,
  employees: `${P}_employees`,
  availabilityRules: `${P}_availability_rules`,
  customDays: `${P}_custom_days`,
  blockedDates: `${P}_blocked_dates`,
  emailTemplates: `${P}_email_templates`,
  emailSettings: `${P}_email_settings`,
  emailLogs: `${P}_email_logs`,
  emailDeliveryLogs: `${P}_email_delivery_logs`,
  blockedSlots: "blocked_slots",
} as const;
