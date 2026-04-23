import type { SubscriptionSnapshot } from "@/lib/wavon/types";

export type BillingAccessState = "SUBSCRIBED" | "BLOCKED";

/**
 * Accès métier Waevon : uniquement abonnement Stripe en règle (`active` ou `past_due`).
 * `sync_error` → bloqué (erreur technique à résoudre).
 */
export function billingAccessStateFromSnapshot(s: SubscriptionSnapshot): BillingAccessState {
  if (s.status === "sync_error") {
    return "BLOCKED";
  }
  if (s.accessSource === "stripe" && (s.status === "active" || s.status === "past_due")) {
    return "SUBSCRIBED";
  }
  return "BLOCKED";
}

export function isBillingBlockedState(state: BillingAccessState): boolean {
  return state === "BLOCKED";
}
