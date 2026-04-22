/**
 * Contrôle d'accès par abonnement.
 *
 * Features réservées au plan Pro (à brancher dans l'UI au fur et à mesure) :
 * - `invoices` : génération automatique de factures PDF (non implémentée pour l'instant).
 *
 * Exemple futur :
 *   if (!canAccessFeature(business, "invoices")) { … CTA Passer au Pro … }
 */

import type { BillingPlanId } from "@/lib/stripe/config";

/** Statuts Stripe alignés avec la colonne `subscription_status` sur `WavonDbTable.businesses`. */
export type SubscriptionStatusDb =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export type GatedFeatureName = "invoices";

const PRO_ONLY_FEATURES = new Set<GatedFeatureName>(["invoices"]);

export type BusinessSubscriptionAccess = {
  subscription_status: string | null;
  subscription_plan: string | null;
};

export function hasActiveSubscription(business: BusinessSubscriptionAccess): boolean {
  const s = business.subscription_status;
  return s === "trialing" || s === "active";
}

/**
 * @returns true si le business a un abonnement actif/essai ET le droit d'utiliser la feature.
 * Les features non listées dans `PRO_ONLY_FEATURES` sont accessibles à tout plan actif.
 */
export function canAccessFeature(
  business: BusinessSubscriptionAccess,
  featureName: GatedFeatureName
): boolean {
  if (!hasActiveSubscription(business)) return false;
  if (!PRO_ONLY_FEATURES.has(featureName)) return true;
  return business.subscription_plan === "pro";
}

export function parseSubscriptionPlan(raw: string | null): BillingPlanId | null {
  if (raw === "starter" || raw === "pro") return raw;
  return null;
}
