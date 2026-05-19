/**
 * Configuration Stripe Prono Clash.
 *
 * Modèle économique :
 *  - Le concours est gratuit et n'a JAMAIS besoin de Stripe.
 *  - Le paiement Stripe sert UNIQUEMENT à créer une ligue privée (one-time
 *    payment, pas de subscription).
 *
 * Plans extensibles (les price IDs Stripe peuvent être ajoutés au fur et à
 * mesure dans les variables d'environnement).
 */

export type LeaguePlanId = "private" | "pro";

export type LeaguePlan = {
  id: LeaguePlanId;
  name: string;
  priceChf: number;
  maxPlayers: number;
  /** Variable d'env contenant le price_id Stripe (one-time). */
  envKey: string;
  features: string[];
  highlight?: boolean;
};

export const LEAGUE_PLANS: Record<LeaguePlanId, LeaguePlan> = {
  private: {
    id: "private",
    name: "Private League",
    priceChf: 9.9,
    maxPlayers: 20,
    envKey: "STRIPE_PRICE_ID_LEAGUE_PRIVATE",
    features: [
      "Jusqu'à 20 joueurs",
      "Cartes spéciales",
      "Classement privé",
      "Lien d'invitation WhatsApp",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro League",
    priceChf: 14.9,
    maxPlayers: 50,
    envKey: "STRIPE_PRICE_ID_LEAGUE_PRO",
    highlight: true,
    features: [
      "Jusqu'à 50 joueurs",
      "Toutes les cartes spéciales",
      "Résumés fun après chaque match",
      "Badges et visuels partageables",
    ],
  },
};

export function isLeaguePlanId(value: unknown): value is LeaguePlanId {
  return value === "private" || value === "pro";
}

export function getStripePriceIdForLeaguePlan(plan: LeaguePlanId): string {
  const cfg = LEAGUE_PLANS[plan];
  const id = process.env[cfg.envKey]?.trim();
  if (!id) {
    throw new Error(`Variable d'environnement ${cfg.envKey} manquante.`);
  }
  return id;
}

export function planFromAmountChf(amount: number | null | undefined): LeaguePlanId | null {
  if (amount == null) return null;
  if (Math.abs(amount - LEAGUE_PLANS.private.priceChf) < 0.01) return "private";
  if (Math.abs(amount - LEAGUE_PLANS.pro.priceChf) < 0.01) return "pro";
  return null;
}
