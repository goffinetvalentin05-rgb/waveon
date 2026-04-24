import type { SubscriptionSnapshot } from "@/lib/wavon/types";

export type BillingAccessState = "SUBSCRIBED" | "BLOCKED";

/**
 * Accès réservé à la vérification Stripe seule (sans essai).
 * Pour le produit complet, utiliser {@link getWorkspaceSubscriptionAccess}.
 */
export function billingAccessStateFromSnapshot(s: SubscriptionSnapshot): BillingAccessState {
  if (s.status === "sync_error") {
    return "BLOCKED";
  }
  if (
    (s.accessSource === "stripe" || s.accessSource === "admin") &&
    (s.status === "active" || s.status === "past_due" || s.status === "trialing")
  ) {
    return "SUBSCRIBED";
  }
  return "BLOCKED";
}

export function isBillingBlockedState(state: BillingAccessState): boolean {
  return state === "BLOCKED";
}
