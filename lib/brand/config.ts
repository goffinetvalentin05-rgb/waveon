/**
 * Identité de marque — Raven, prospection B2B.
 */

export const brand = {
  name: "Raven",
  shortName: "Raven",
  tagline: "Prospection B2B",
  promise: "Trouver, contacter, convertir.",
  legalEntityHint: "Raven",
  contactEmail: "contact@obillz.com",
  supportEmail: "support@obillz.com",
  domain: "localhost",
  description:
    "Outil professionnel de prospection B2B : rechercher des prospects, les organiser, les contacter et suivre leur avancement jusqu’à la conversion.",
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
