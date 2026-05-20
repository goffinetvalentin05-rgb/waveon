/**
 * Identité de marque centralisée.
 *
 * IMPORTANT : Le nom est volontairement isolé ici pour pouvoir le changer
 * partout d'un seul endroit. Ne pas dupliquer ces valeurs ailleurs.
 */

export const brand = {
  name: "Waevon",
  shortName: "Waevon",
  tagline: "Pronostique. Joue des cartes. Sabote tes potes.",
  promise:
    "Pronostique les matchs, joue des cartes, sabote tes potes et deviens le champion de ta ligue.",
  legalEntityHint: "Waevon",
  contactEmail: "contact@waevon.com",
  supportEmail: "support@waevon.com",
  domain: "waevon.com",
  description:
    "Le jeu de pronostics entre potes pour le tournoi mondial de foot 2026. Crée ta ligue privée, joue des cartes spéciales, sabote tes amis. Sans pari d'argent.",
  tournamentLabel: "Tournoi mondial 2026",
  notAGamblingDisclaimer:
    "Jeu de pronostics entre amis, sans mise d'argent. Aucune affiliation officielle avec la FIFA, la Coupe du Monde ou les fédérations sportives.",
} as const;

export type Brand = typeof brand;

export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
