/**
 * Identité de marque — CRM de prospection personnel (Obillz).
 */

export const brand = {
  name: "Prospection",
  shortName: "Prospection",
  tagline: "Votre espace de travail.",
  promise: "CRM, calendrier et outils du quotidien, en un seul endroit.",
  legalEntityHint: "Prospection",
  contactEmail: "contact@obillz.com",
  supportEmail: "support@obillz.com",
  domain: "localhost",
  description:
    "Espace de travail personnel : prospection, calendrier et apprentissage.",
} as const;

export type Brand = typeof brand;

export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
