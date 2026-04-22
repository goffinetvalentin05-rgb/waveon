import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { planFromStripePriceId } from "@/lib/stripe/config";
import type { SubscriptionStatusDb } from "@/lib/subscription/access";

function normalizeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatusDb {
  if (
    status === "trialing" ||
    status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete"
  ) {
    return status;
  }
  if (status === "incomplete_expired") return "canceled";
  /** @see TODO.md — statut `paused` Stripe non modélisé à ce jour */
  if (status === "paused") return "active";
  return "active";
}

function resolvePlan(sub: Stripe.Subscription): "starter" | "pro" | null {
  const m = sub.metadata?.plan;
  if (m === "starter" || m === "pro") return m;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  return planFromStripePriceId(priceId);
}

function tsToIso(sec: number | null | undefined): string | null {
  if (sec == null) return null;
  return new Date(sec * 1000).toISOString();
}

/** Fin de période facturée (API récente : sur l’item d’abonnement, pas sur l’objet Subscription racine). */
function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const first = sub.items?.data?.[0];
  const end = first?.current_period_end;
  return typeof end === "number" ? end : null;
}

export async function syncBusinessFromStripeSubscription(
  admin: SupabaseClient,
  businessId: string,
  sub: Stripe.Subscription
): Promise<void> {
  const plan = resolvePlan(sub);
  const { error } = await admin
    .from("wavon_businesses")
    .update({
      stripe_subscription_id: sub.id,
      subscription_status: normalizeSubscriptionStatus(sub.status),
      subscription_plan: plan,
      trial_ends_at: tsToIso(sub.trial_end),
      current_period_end: tsToIso(subscriptionCurrentPeriodEndUnix(sub)),
      cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    })
    .eq("id", businessId);
  if (error) throw error;
}

export async function findBusinessIdByStripeSubscription(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("wavon_businesses")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string } | null)?.id ?? null;
}

export async function findBusinessIdByStripeCustomer(
  admin: SupabaseClient,
  customerId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("wavon_businesses")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string } | null)?.id ?? null;
}

export async function clearSubscriptionCanceled(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<void> {
  const { error } = await admin
    .from("wavon_businesses")
    .update({
      stripe_subscription_id: null,
      subscription_status: "canceled",
    })
    .eq("stripe_subscription_id", subscriptionId);
  if (error) throw error;
}

export async function markPastDueByCustomerId(
  admin: SupabaseClient,
  customerId: string
): Promise<void> {
  const { error } = await admin
    .from("wavon_businesses")
    .update({ subscription_status: "past_due" })
    .eq("stripe_customer_id", customerId);
  if (error) throw error;
}
