/**
 * Mapping Stripe → statuts internes (`SubscriptionSnapshot.status`).
 * Pas d’essai gratuit Waevon : `trialing` (Stripe) est traité comme `active` pour l’accès produit.
 */

/** Normalise le statut renvoyé par l’objet Subscription Stripe. */
export function snapshotStatusFromStripeApi(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "incomplete_expired") return "canceled";
  if (s === "paused") return "active";
  if (s === "unpaid" || s === "incomplete") return "canceled";
  if (s === "trialing") return "active";
  return s;
}

/**
 * Interprète `wavon_businesses.subscription_status` quand l’API Stripe n’est pas disponible.
 */
export function snapshotStatusFromDatabaseColumn(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "unpaid" || s === "incomplete") return "canceled";
  if (s === "expired" || s === "trial_expired") return "inactive";
  if (s === "trialing") return "active";
  if (s === "active" || s === "past_due" || s === "canceled" || s === "inactive") return s;
  return null;
}
