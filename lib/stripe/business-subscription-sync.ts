import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { snapshotStatusFromStripeApi } from "@/lib/subscription/stripe-wavon-status";
import { planFromStripePriceId } from "./config";
import { invalidateBusinessSubscriptionCache } from "./subscription";

function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const first = sub.items?.data?.[0];
  const end = first?.current_period_end;
  return typeof end === "number" ? end : null;
}

function tsToIso(sec: number | null | undefined): string | null {
  if (sec == null) return null;
  return new Date(sec * 1000).toISOString();
}

function resolvePlanFromStripeSub(sub: Stripe.Subscription): "starter" | "pro" | null {
  const m = sub.metadata?.plan;
  if (m === "starter" || m === "pro") return m;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  return planFromStripePriceId(priceId);
}

export type StripeBusinessSyncResult = {
  businessId: string;
  updated: boolean;
};

/**
 * Met à jour wavon_businesses à partir d’un abonnement Stripe (webhook, retour checkout, lecture live).
 */
export async function syncStripeSubscriptionToBusinessRow(
  businessId: string,
  sub: Stripe.Subscription
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const status = snapshotStatusFromStripeApi(sub.status);
  const plan = resolvePlanFromStripeSub(sub);
  const periodEndIso = tsToIso(subscriptionCurrentPeriodEndUnix(sub));

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const patch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    subscription_status: status,
    current_period_end: periodEndIso,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  };
  if (customerId) patch.stripe_customer_id = customerId;
  if (plan) patch.subscription_plan = plan;

  const { error } = await admin.from(WavonDbTable.businesses).update(patch).eq("id", businessId);

  if (error) throw error;
  await syncProfileWithStripeAccess(admin, businessId, plan, status);
  invalidateBusinessSubscriptionCache(businessId);
}

async function syncProfileWithStripeAccess(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  businessId: string,
  plan: "starter" | "pro" | null,
  subscriptionStatus: string
): Promise<void> {
  const { data: row, error: qErr } = await admin
    .from(WavonDbTable.businesses)
    .select("user_id")
    .eq("id", businessId)
    .maybeSingle();
  if (qErr || !row) return;
  const userId = (row as { user_id: string | null }).user_id;
  if (!userId) return;
  const activeStatus =
    subscriptionStatus === "active" || subscriptionStatus === "trialing" || subscriptionStatus === "past_due";
  const profilePatch: Record<string, unknown> = {
    subscription_status: activeStatus ? "active" : "expired",
    plan: plan ?? "starter",
  };
  if (activeStatus) {
    profilePatch.trial_end = null;
    profilePatch.trial_start = null;
  }
  const { error: pErr } = await admin.from("profiles").update(profilePatch).eq("id", userId);
  if (pErr) {
    console.warn("[stripe] sync profil", pErr.message);
  }
}

export async function findBusinessIdForStripeCustomer(customerId: string): Promise<string | null> {
  const id = customerId?.trim();
  if (!id) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from(WavonDbTable.businesses)
    .select("id")
    .eq("stripe_customer_id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string } | null)?.id ?? null;
}

export async function resolveBusinessIdFromStripeSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.business_id?.trim();
  if (fromMeta) return fromMeta;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (customerId) {
    const fromCustomer = await findBusinessIdForStripeCustomer(customerId);
    if (fromCustomer) return fromCustomer;
  }

  return null;
}

/**
 * Fin d’abonnement côté Stripe (`customer.subscription.deleted`).
 */
export async function applyStripeSubscriptionDeleted(businessId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data: biz } = await admin
    .from(WavonDbTable.businesses)
    .select("user_id")
    .eq("id", businessId)
    .maybeSingle();
  const { error: upErr } = await admin
    .from(WavonDbTable.businesses)
    .update({
      stripe_subscription_id: null,
      subscription_status: "inactive",
      subscription_plan: null,
      cancel_at_period_end: false,
    })
    .eq("id", businessId);
  if (upErr) throw upErr;
  const userId = (biz as { user_id: string | null } | null)?.user_id;
  if (userId) {
    const { error: pErr } = await admin
      .from("profiles")
      .update({ subscription_status: "expired" })
      .eq("id", userId);
    if (pErr) {
      console.warn("[stripe] profil fin abo", pErr.message);
    }
  }
  invalidateBusinessSubscriptionCache(businessId);
}
