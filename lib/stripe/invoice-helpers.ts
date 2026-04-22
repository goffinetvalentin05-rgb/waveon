import type Stripe from "stripe";

/** ID d’abonnement lié à une facture (structure `parent.subscription_details` API récente). */
export function subscriptionIdFromInvoice(inv: Stripe.Invoice): string | null {
  const sub = inv.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}
