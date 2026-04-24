/**
 * Noms des tables métier `public.wavon_*` (préfixe SQL sans « e »).
 *
 * Les tables Supabase de ce projet sont toujours `wavon_businesses`, `wavon_clients`, etc.
 * La marque affichée reste « Waevon » ; ne pas confondre avec le préfixe SQL.
 *
 * Les variables d’environnement `NEXT_PUBLIC_WAEVON_DB_TABLE_PREFIX` /
 * `WAEVON_DB_TABLE_PREFIX` ne sont plus lues : elles provoquaient des requêtes vers
 * `waevon_*` alors que ces tables n’existent pas sur la base réelle.
 */

const TABLE_PREFIX = "wavon" as const;

export type WavonSqlTablePrefix = typeof TABLE_PREFIX;

export function getWavonDbTablePrefix(): WavonSqlTablePrefix {
  return TABLE_PREFIX;
}

/** Tables avec le préfixe métier (`wavon_…`). */
export const WavonDbTable = {
  businesses: `${TABLE_PREFIX}_businesses`,
  settings: `${TABLE_PREFIX}_settings`,
  services: `${TABLE_PREFIX}_services`,
  clients: `${TABLE_PREFIX}_clients`,
  reservations: `${TABLE_PREFIX}_reservations`,
  invoices: `${TABLE_PREFIX}_invoices`,
  invoiceSettings: `${TABLE_PREFIX}_invoice_settings`,
  employees: `${TABLE_PREFIX}_employees`,
  availabilityRules: `${TABLE_PREFIX}_availability_rules`,
  customDays: `${TABLE_PREFIX}_custom_days`,
  blockedDates: `${TABLE_PREFIX}_blocked_dates`,
  emailTemplates: `${TABLE_PREFIX}_email_templates`,
  emailSettings: `${TABLE_PREFIX}_email_settings`,
  emailLogs: `${TABLE_PREFIX}_email_logs`,
  emailDeliveryLogs: `${TABLE_PREFIX}_email_delivery_logs`,
  blockedSlots: "blocked_slots",
} as const;
