import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { EMPTY_SUBSCRIPTION_SNAPSHOT, type SubscriptionSnapshot } from "@/lib/wavon/types";
import { getEffectiveTrialEnd } from "@/lib/subscription/trial-window";
import { planFromStripePriceId } from "./config";
import { requireStripe } from "./client";
import { syncStripeSubscriptionToBusinessRow } from "./business-subscription-sync";

type CacheEntry = { expiresAt: number; value: SubscriptionSnapshot };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export function invalidateBusinessSubscriptionCache(businessId: string): void {
  cache.delete(businessId);
}

function normalizeSubscriptionStatus(status: Stripe.Subscription.Status): string {
  if (status === "incomplete_expired") return "canceled";
  if (status === "paused") return "active";
  return status;
}

function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const first = sub.items?.data?.[0];
  const end = first?.current_period_end;
  return typeof end === "number" ? end : null;
}

function tsToIso(sec: number | null | undefined): string | null {
  if (sec == null) return null;
  return new Date(sec * 1000).toISOString();
}

function resolvePlan(sub: Stripe.Subscription): "starter" | "pro" | null {
  const m = sub.metadata?.plan;
  if (m === "starter" || m === "pro") return m;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  return planFromStripePriceId(priceId);
}

function snapshotFromStripe(sub: Stripe.Subscription): SubscriptionSnapshot {
  return {
    status: normalizeSubscriptionStatus(sub.status),
    plan: resolvePlan(sub),
    trialEndsAt: tsToIso(sub.trial_end),
    currentPeriodEnd: tsToIso(subscriptionCurrentPeriodEndUnix(sub)),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    accessSource: "stripe",
  };
}

function waevonTrialSnapshot(trialEndsAtIso: string, expired: boolean): SubscriptionSnapshot {
  if (expired) {
    return {
      status: "trial_expired",
      plan: null,
      trialEndsAt: trialEndsAtIso,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      accessSource: "waevon",
    };
  }
  return {
    status: "trialing",
    plan: null,
    trialEndsAt: trialEndsAtIso,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    accessSource: "waevon",
  };
}

type BusinessBillingRow = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  created_at: string | null;
};

const EMPTY_ROW: BusinessBillingRow = {
  stripe_customer_id: null,
  stripe_subscription_id: null,
  trial_started_at: null,
  trial_ends_at: null,
  subscription_status: null,
  created_at: null,
};

async function persistWaevonExpired(businessId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from(WavonDbTable.businesses)
    .update({ subscription_status: "expired" })
    .eq("id", businessId);
  if (error) console.error("[subscription] persistWaevonExpired", error);
}

async function clearStaleStripeSubscription(
  businessId: string,
  trialRow: BusinessBillingRow
): Promise<SubscriptionSnapshot> {
  const admin = createAdminSupabaseClient();
  await admin
    .from(WavonDbTable.businesses)
    .update({ stripe_subscription_id: null })
    .eq("id", businessId);
  invalidateBusinessSubscriptionCache(businessId);

  const eff = getEffectiveTrialEnd(trialRow);
  const now = Date.now();
  if (eff) {
    const expired = eff.endMs <= now;
    if (expired) await persistWaevonExpired(businessId);
    return waevonTrialSnapshot(eff.iso, expired);
  }
  await persistWaevonExpired(businessId);
  return {
    ...EMPTY_SUBSCRIPTION_SNAPSHOT,
    status: "trial_expired",
    accessSource: "waevon",
  };
}

/**
 * Accès facturation : abonnement Stripe (API live + synchro DB) ou essai Waevon (`trial_ends_at` / repli sur `created_at`).
 */
export async function getBusinessSubscriptionStatus(businessId: string): Promise<SubscriptionSnapshot> {
  const now = Date.now();
  const hit = cache.get(businessId);
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from(WavonDbTable.businesses)
    .select(
      "stripe_customer_id, stripe_subscription_id, trial_started_at, trial_ends_at, subscription_status, created_at"
    )
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;

  const row = data as BusinessBillingRow | null;
  const subId = row?.stripe_subscription_id?.trim() ?? "";

  let snapshot: SubscriptionSnapshot;

  if (subId) {
    const stripe = requireStripe();
    try {
      const sub = await stripe.subscriptions.retrieve(subId, {
        expand: ["items.data.price"],
      });
      await syncStripeSubscriptionToBusinessRow(businessId, sub);
      snapshot = snapshotFromStripe(sub);
    } catch (e) {
      const err = e as { code?: string; statusCode?: number };
      if (err.code === "resource_missing" || err.statusCode === 404) {
        snapshot = await clearStaleStripeSubscription(businessId, row ?? EMPTY_ROW);
      } else {
        throw e;
      }
    }
  } else {
    if (!row) {
      snapshot = { ...EMPTY_SUBSCRIPTION_SNAPSHOT, status: "trial_expired", accessSource: "waevon" };
    } else {
      if (row.subscription_status === "expired") {
        const eff = getEffectiveTrialEnd(row);
        snapshot = waevonTrialSnapshot(
          eff?.iso ?? row.trial_ends_at ?? new Date().toISOString(),
          true
        );
      } else {
        const eff = getEffectiveTrialEnd(row);
        if (eff) {
          const expired = eff.endMs <= now;
          if (expired) {
            await persistWaevonExpired(businessId);
            snapshot = waevonTrialSnapshot(eff.iso, true);
          } else {
            snapshot = waevonTrialSnapshot(eff.iso, false);
          }
        } else {
          await persistWaevonExpired(businessId);
          snapshot = {
            ...EMPTY_SUBSCRIPTION_SNAPSHOT,
            status: "trial_expired",
            accessSource: "waevon",
          };
        }
      }
    }
  }

  const enriched: SubscriptionSnapshot = {
    ...snapshot,
    trialStartedAt: row?.trial_started_at ?? undefined,
    stripeCustomerId: row?.stripe_customer_id ?? undefined,
  };

  cache.set(businessId, { expiresAt: now + TTL_MS, value: enriched });
  return enriched;
}
