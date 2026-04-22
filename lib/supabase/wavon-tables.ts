/**
 * Noms des tables métier `public.*` — alignés sur les migrations Supabase du dépôt.
 *
 * Le préfixe SQL est **`wavon_`** (sans « e »). La marque produit s’écrit « Waevon ».
 * Il n’existe pas de table `waevon_businesses` dans ce schéma : ne pas renommer sans migration SQL
 * (FK, fonctions `wavon_*`, politiques RLS).
 */
export const WavonDbTable = {
  businesses: "wavon_businesses",
  settings: "wavon_settings",
  services: "wavon_services",
  clients: "wavon_clients",
  reservations: "wavon_reservations",
  employees: "wavon_employees",
  availabilityRules: "wavon_availability_rules",
  customDays: "wavon_custom_days",
  blockedDates: "wavon_blocked_dates",
  emailTemplates: "wavon_email_templates",
  emailSettings: "wavon_email_settings",
  emailLogs: "wavon_email_logs",
  emailDeliveryLogs: "wavon_email_delivery_logs",
  blockedSlots: "blocked_slots",
} as const;
