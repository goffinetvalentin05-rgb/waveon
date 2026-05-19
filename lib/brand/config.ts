/**
 * Identité de marque centralisée.
 *
 * IMPORTANT : Le nom est volontairement isolé ici pour pouvoir le changer
 * partout d'un seul endroit (le produit s'appelle "Prono Clash" pour le
 * moment, mais peut être renommé sans toucher au reste de l'app).
 *
 * Ne pas dupliquer ces valeurs ailleurs ; importer depuis ce module.
 */

export const brand = {
  name: "Prono Clash",
  shortName: "Prono Clash",
  tagline: "Pronostique. Joue des cartes. Sabote tes potes.",
  promise:
    "Pronostique les matchs, joue des cartes, sabote tes potes et deviens le champion de ta ligue.",
  legalEntityHint: "Prono Clash",
  contactEmail: "contact@pronoclash.app",
  supportEmail: "support@pronoclash.app",
  domain: "pronoclash.app",
  // Métadonnées SEO / OG
  description:
    "Le jeu de pronostics entre potes pour la Coupe du monde. Crée ta ligue privée, joue des cartes spéciales, sabote tes amis. Sans pari d'argent.",
  // Restriction légale visible partout
  notAGamblingDisclaimer:
    "Jeu de pronostics entre amis, sans mise d'argent. Aucune affiliation officielle avec la FIFA, la Coupe du Monde ou les fédérations sportives.",
} as const;

export type Brand = typeof brand;

export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
