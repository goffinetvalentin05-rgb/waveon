/**
 * Mapping explicite Stripe → statuts internes du snapshot (`SubscriptionSnapshot.status`).
 *
 * - Les valeurs renvoyées par l’API Stripe (`Subscription.status`) sont normalisées ici.
 * - Côté affichage métier Waevon, voir `getBillingStatus()` / `billingStatusPublicLabel()`.
 *
 * | Stripe (API)           | Snapshot.status (interne) | Remarque                          |
 * |------------------------|---------------------------|-----------------------------------|
 * | active                 | active                    | Abonnement facturé actif          |
 * | trialing               | trialing                  | Essai inclus dans l’offre Stripe  |
 * | past_due               | past_due                  | Paiement en retard                |
 * | canceled               | canceled                  | Abonnement terminé / annulé       |
 * | unpaid                 | canceled                  | Très en retard → traité comme fin |
 * | incomplete             | canceled                  | Checkout non finalisé             |
 * | incomplete_expired     | canceled                  | Session expirée                   |
 * | paused                 | active                    | Stripe pause → accès maintenu     |
 *
 * Essai Waevon (sans Stripe) : `accessSource: waevon`, `status: trialing` ou `trial_expired`
 * (ce dernier est mappé en `expired` pour l’UI dans `getBillingStatus`).
 */

/** Normalise le statut renvoyé par l’objet Subscription Stripe. */
export function snapshotStatusFromStripeApi(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "incomplete_expired") return "canceled";
  if (s === "paused") return "active";
  if (s === "unpaid" || s === "incomplete") return "canceled";
  return s;
}

/**
 * Interprète `wavon_businesses.subscription_status` quand l’API Stripe n’est pas disponible.
 * Valeurs attendues en base : trialing, active, expired, past_due, canceled, (+ legacy unpaid/incomplete).
 */
export function snapshotStatusFromDatabaseColumn(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "expired") return "trial_expired";
  if (s === "unpaid" || s === "incomplete") return "canceled";
  if (s === "trial_expired") return "trial_expired";
  if (s === "trialing" || s === "active" || s === "past_due" || s === "canceled") return s;
  return null;
}
