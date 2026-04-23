/**
 * Contrôle d'accès par abonnement.
 *
 * Features réservées au plan Pro (à brancher dans l'UI au fur et à mesure) :
 * - `invoices` : génération automatique de factures PDF (non implémentée pour l'instant).
 *
 * Exemple futur :
 *   if (!canAccessFeature({ status, plan }, "invoices")) { … CTA Passer au Pro … }
 */

import type { BillingPlanId } from "@/lib/stripe/config";

/** Statuts persistés / Stripe normalisés. */
export type SubscriptionStatusDb =
  | "active"
  | "past_due"
  | "canceled"
  | "inactive"
  | "unpaid"
  | "incomplete";

export type GatedFeatureName = "invoices";

const PRO_ONLY_FEATURES = new Set<GatedFeatureName>(["invoices"]);

export type BusinessSubscriptionAccess = {
  status: string;
  plan: string | null;
};

/** Abonnement utilisable (paiement à jour ou en retard de paiement à régulariser). */
export function hasActiveSubscription(business: BusinessSubscriptionAccess): boolean {
  return business.status === "active" || business.status === "past_due";
}

/**
 * @returns true si le business a un abonnement Stripe utilisable (`active` ou `past_due`).
 * Les features non listées dans `PRO_ONLY_FEATURES` sont accessibles à tout plan actif.
 */
export function canAccessFeature(
  business: BusinessSubscriptionAccess,
  featureName: GatedFeatureName
): boolean {
  if (!hasActiveSubscription(business)) return false;
  if (!PRO_ONLY_FEATURES.has(featureName)) return true;
  return business.plan === "pro";
}

export function parseSubscriptionPlan(raw: string | null): BillingPlanId | null {
  if (raw === "starter" || raw === "pro") return raw;
  return null;
}
