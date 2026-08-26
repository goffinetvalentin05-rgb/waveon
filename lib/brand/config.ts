/**
 * Identité de marque — Waveone, cockpit personnel.
 */

export const brand = {
  name: "Waveone",
  shortName: "Waveone",
  tagline: "Votre command center.",
  promise: "Personnel et projets, clairement séparés.",
  legalEntityHint: "Waveone",
  contactEmail: "contact@obillz.com",
  supportEmail: "support@obillz.com",
  domain: "localhost",
  description:
    "Command center personnel et professionnel : projets, prospection et organisation.",
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
