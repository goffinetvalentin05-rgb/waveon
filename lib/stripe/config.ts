/**
 * Configuration facturation Waevon (Stripe).
 * Les price IDs viennent du Dashboard Stripe (mode test ou live).
 */

export type BillingPlanId = "starter" | "pro";

/** Durée de l’essai gratuit Waevon (sans carte, géré en base : `trial_ends_at`). Pas de période d’essai Stripe Checkout. */
export const WAEVON_TRIAL_DAYS = 7;

export const PLAN_LABELS: Record<BillingPlanId, string> = {
  starter: "Starter",
  pro: "Pro",
};

/** Prix affichés (CHF / mois) — alignés sur les produits Stripe. */
export const PLAN_MONTHLY_PRICE_CHF: Record<BillingPlanId, number> = {
  starter: 20,
  pro: 35,
};

export function getStripePriceIdForPlan(plan: BillingPlanId): string {
  const key =
    plan === "starter" ? "STRIPE_PRICE_ID_STARTER" : "STRIPE_PRICE_ID_PRO";
  const id = process.env[key]?.trim();
  if (!id) {
    throw new Error(`Variable d'environnement ${key} manquante.`);
  }
  return id;
}

export function planFromStripePriceId(priceId: string | null | undefined): BillingPlanId | null {
  if (!priceId) return null;
  const starter = process.env.STRIPE_PRICE_ID_STARTER?.trim();
  const pro = process.env.STRIPE_PRICE_ID_PRO?.trim();
  if (priceId === starter) return "starter";
  if (priceId === pro) return "pro";
  return null;
}

export function isBillingPlanId(value: unknown): value is BillingPlanId {
  return value === "starter" || value === "pro";
}
