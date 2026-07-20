/**
 * Identité de marque — CRM de prospection personnel (Obillz).
 */

export const brand = {
  name: "Prospection CRM",
  shortName: "Prospection",
  tagline: "Votre espace de prospection.",
  promise: "Gérez vos prospects, relances et démos en un seul endroit.",
  legalEntityHint: "Prospection CRM",
  contactEmail: "contact@obillz.com",
  supportEmail: "support@obillz.com",
  domain: "localhost",
  description:
    "CRM de prospection personnel pour suivre clubs, relances et clients Obillz.",
} as const;

export type Brand = typeof brand;

export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
