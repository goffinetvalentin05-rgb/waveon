import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { EMPTY_SUBSCRIPTION_SNAPSHOT, type SubscriptionSnapshot } from "@/lib/wavon/types";
import { planFromStripePriceId } from "./config";
import { requireStripe } from "./client";

type CacheEntry = { expiresAt: number; value: SubscriptionSnapshot };

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export function invalidateBusinessSubscriptionCache(businessId: string): void {
  cache.delete(businessId);
}

function normalizeSubscriptionStatus(status: Stripe.Subscription.Status): string {
  if (status === "incomplete_expired") return "canceled";
  /** @see TODO.md — statut `paused` Stripe non modélisé à ce jour */
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

/**
 * Accès facturation : abonnement Stripe (API live + cache 60 s) ou essai Waevon (`trial_ends_at`).
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
    .select("stripe_subscription_id, trial_ends_at")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;

  const row = data as { stripe_subscription_id: string | null; trial_ends_at: string | null } | null;
  const subId = row?.stripe_subscription_id?.trim() ?? "";

  let snapshot: SubscriptionSnapshot;

  if (subId) {
    const stripe = requireStripe();
    try {
      const sub = await stripe.subscriptions.retrieve(subId, {
        expand: ["items.data.price"],
      });
      snapshot = snapshotFromStripe(sub);
    } catch (e) {
      const err = e as { code?: string; statusCode?: number };
      if (err.code === "resource_missing" || err.statusCode === 404) {
        snapshot = {
          status: "canceled",
          plan: null,
          trialEndsAt: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          accessSource: "stripe",
        };
      } else {
        throw e;
      }
    }
  } else {
    const trialRaw = row?.trial_ends_at ?? null;
    if (trialRaw) {
      const endMs = new Date(trialRaw).getTime();
      if (!Number.isFinite(endMs)) {
        snapshot = {
          ...EMPTY_SUBSCRIPTION_SNAPSHOT,
          status: "trial_expired",
          accessSource: "waevon",
        };
      } else {
        snapshot = waevonTrialSnapshot(trialRaw, endMs <= now);
      }
    } else {
      snapshot = {
        ...EMPTY_SUBSCRIPTION_SNAPSHOT,
        status: "trial_expired",
        accessSource: "waevon",
      };
    }
  }

  cache.set(businessId, { expiresAt: now + TTL_MS, value: snapshot });
  return snapshot;
}
