import type { SupabaseClient } from "@supabase/supabase-js";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireStripe } from "./client";
import { syncStripeSubscriptionToBusinessRow } from "./business-subscription-sync";

/**
 * Après Checkout (`success_url` avec `session_id`), synchronise l’abonnement Stripe en base (statut, période, plan).
 */
export async function persistCheckoutSessionSubscription(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<void> {
  const stripe = requireStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.mode !== "subscription") {
    console.warn("[checkout-return] session.mode !== subscription", session.id);
    return;
  }

  const subRaw = session.subscription;
  const subscriptionId = typeof subRaw === "string" ? subRaw : subRaw?.id;
  if (!subscriptionId) {
    console.warn("[checkout-return] pas de subscription sur la session", session.id);
    return;
  }

  const businessId =
    session.metadata?.business_id?.trim() || session.client_reference_id?.trim() || null;
  if (!businessId) {
    console.warn("[checkout-return] session sans business_id", session.id);
    return;
  }

  const { data: biz, error } = await supabase
    .from(WavonDbTable.businesses)
    .select("id, user_id")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  const row = biz as { id: string; user_id: string } | null;
  if (!row || row.user_id !== userId) {
    console.warn("[checkout-return] business / user mismatch", { businessId, userId });
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  await syncStripeSubscriptionToBusinessRow(businessId, sub);
}
