/**
 * Identité de marque — Waveone, cockpit personnel.
 */

export const brand = {
  name: "Waveone",
  shortName: "Waveone",
  tagline: "Votre cockpit personnel.",
  promise: "Prospection, anglais, calendrier et tâches, en un seul endroit.",
  legalEntityHint: "Waveone",
  contactEmail: "contact@obillz.com",
  supportEmail: "support@obillz.com",
  domain: "localhost",
  description:
    "Espace de travail personnel : prospection, calendrier, anglais et organisation.",
} as const;

export type Brand = typeof brand;

export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function firstNameFromDisplay(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "toi";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}
