import type { SubscriptionSnapshot } from "@/lib/wavon/types";

export type BillingAccessState = "TRIAL_ACTIVE" | "SUBSCRIBED" | "BLOCKED";

/**
 * Règle produit :
 * - TRIAL_ACTIVE : essai Waevon encore valide
 * - SUBSCRIBED : abonnement Stripe utilisable (actif, essai Stripe, ou past_due pour régulariser)
 * - BLOCKED : tout le reste (essai expiré, sans abonnement valide, Stripe canceled/unpaid/incomplete, etc.)
 */
export function billingAccessStateFromSnapshot(s: SubscriptionSnapshot): BillingAccessState {
  if (s.accessSource === "waevon" && s.status === "trialing") {
    return "TRIAL_ACTIVE";
  }
  if (s.accessSource === "stripe") {
    if (s.status === "active" || s.status === "trialing" || s.status === "past_due") {
      return "SUBSCRIBED";
    }
  }
  return "BLOCKED";
}

export function isBillingBlockedState(state: BillingAccessState): boolean {
  return state === "BLOCKED";
}
