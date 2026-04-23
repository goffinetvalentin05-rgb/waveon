import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseSubscriptionPlan } from "@/lib/subscription/access";
import { snapshotStatusFromDatabaseColumn, snapshotStatusFromStripeApi } from "@/lib/subscription/stripe-wavon-status";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { SYNC_ERROR_SUBSCRIPTION_SNAPSHOT, type SubscriptionSnapshot } from "@/lib/wavon/types";
import { syncStripeSubscriptionToBusinessRow } from "./business-subscription-sync";
import { isStripeSecretConfigured, requireStripe } from "./client";
import { planFromStripePriceId } from "./config";

type CacheEntry = { expiresAt: number; value: SubscriptionSnapshot };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function billingDebugEnabled(): boolean {
  return (
    (process.env.BILLING_DEBUG ?? "").trim() === "1" ||
    (process.env.NEXT_PUBLIC_BILLING_DEBUG ?? "").trim() === "1"
  );
}

export function invalidateBusinessSubscriptionCache(businessId: string): void {
  cache.delete(businessId);
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
    status: snapshotStatusFromStripeApi(String(sub.status)),
    plan: resolvePlan(sub),
    currentPeriodEnd: tsToIso(subscriptionCurrentPeriodEndUnix(sub)),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    accessSource: "stripe",
  };
}

type BusinessBillingRow = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string | null;
};

const EMPTY_ROW: BusinessBillingRow = {
  stripe_customer_id: null,
  stripe_subscription_id: null,
  subscription_plan: null,
  subscription_status: null,
  current_period_end: null,
  cancel_at_period_end: null,
  created_at: null,
};

function inactiveSnapshotFromRow(row: BusinessBillingRow): SubscriptionSnapshot {
  return {
    status: "inactive",
    plan: parseSubscriptionPlan(row.subscription_plan),
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    accessSource: "none",
    stripeCustomerId: row.stripe_customer_id ?? undefined,
  };
}

function isMissingColumnError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  if (err?.code === "42703") return true;
  const msg = String(err?.message ?? "");
  return msg.toLowerCase().includes("does not exist") && msg.toLowerCase().includes("column");
}

async function readBusinessBillingRowBestEffort(
  businessId: string
): Promise<{ row: BusinessBillingRow | null; mode: "full" | "compat" }> {
  const admin = createAdminSupabaseClient();
  try {
    const { data, error } = await admin
      .from(WavonDbTable.businesses)
      .select(
        "stripe_customer_id, stripe_subscription_id, subscription_plan, subscription_status, current_period_end, cancel_at_period_end, created_at"
      )
      .eq("id", businessId)
      .maybeSingle();
    if (error) throw error;
    return { row: (data as BusinessBillingRow | null) ?? null, mode: "full" };
  } catch (e) {
    if (!isMissingColumnError(e)) throw e;
    const { data, error } = await admin
      .from(WavonDbTable.businesses)
      .select("stripe_customer_id, stripe_subscription_id, created_at")
      .eq("id", businessId)
      .maybeSingle();
    if (error) throw error;
    const r = (data as Partial<BusinessBillingRow> | null) ?? null;
    const row: BusinessBillingRow | null = r
      ? {
          ...EMPTY_ROW,
          stripe_customer_id: (r.stripe_customer_id as string | null) ?? null,
          stripe_subscription_id: (r.stripe_subscription_id as string | null) ?? null,
          created_at: (r.created_at as string | null) ?? null,
        }
      : null;
    return { row, mode: "compat" };
  }
}

/**
 * Repli quand Stripe est indisponible : uniquement colonnes `wavon_businesses`.
 */
function snapshotFromBusinessRowDbOnly(row: BusinessBillingRow): SubscriptionSnapshot {
  const subId = row.stripe_subscription_id?.trim() ?? "";
  if (!subId) {
    return inactiveSnapshotFromRow(row);
  }

  const dbSt = snapshotStatusFromDatabaseColumn(row.subscription_status);
  const base: Omit<SubscriptionSnapshot, "status"> = {
    plan: parseSubscriptionPlan(row.subscription_plan),
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    accessSource: "stripe",
    stripeCustomerId: row.stripe_customer_id ?? undefined,
  };

  if (dbSt === "active" || dbSt === "past_due") {
    return { status: dbSt, ...base };
  }
  if (dbSt === "canceled" || dbSt === "inactive") {
    return { status: dbSt, ...base };
  }

  console.warn("[subscription] stripe_subscription_id présent mais subscription_status DB inconnu — inactive", {
    subscription_status: row.subscription_status,
  });
  return { status: "inactive", ...base };
}

async function clearStaleStripeSubscription(businessId: string, row: BusinessBillingRow): Promise<SubscriptionSnapshot> {
  const admin = createAdminSupabaseClient();
  await admin
    .from(WavonDbTable.businesses)
    .update({ stripe_subscription_id: null, subscription_status: "inactive" })
    .eq("id", businessId);
  invalidateBusinessSubscriptionCache(businessId);
  return inactiveSnapshotFromRow({ ...row, stripe_subscription_id: null, subscription_status: "inactive" });
}

async function resolveStripeSnapshot(businessId: string, row: BusinessBillingRow): Promise<SubscriptionSnapshot> {
  const subId = row.stripe_subscription_id?.trim() ?? "";
  if (!subId) {
    return inactiveSnapshotFromRow(row);
  }

  if (!isStripeSecretConfigured()) {
    console.warn("[subscription] STRIPE_SECRET_KEY absente — repli colonnes DB", { businessId });
    return snapshotFromBusinessRowDbOnly(row);
  }

  try {
    const stripe = requireStripe();
    const sub = await stripe.subscriptions.retrieve(subId, {
      expand: ["items.data.price"],
    });
    if (billingDebugEnabled()) {
      console.log("[billing] Stripe subscription retrieved", {
        businessId,
        stripe_subscription_id: subId,
        stripe_status_raw: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
      });
    }
    await syncStripeSubscriptionToBusinessRow(businessId, sub);
    const snap = snapshotFromStripe(sub);
    return { ...snap, stripeCustomerId: row.stripe_customer_id ?? undefined };
  } catch (e) {
    const err = e as { code?: string; statusCode?: number; message?: string };
    if (err.code === "resource_missing" || err.statusCode === 404) {
      if (billingDebugEnabled()) {
        console.warn("[billing] Stripe subscription missing -> clear stale id", {
          businessId,
          stripe_subscription_id: subId,
        });
      }
      return clearStaleStripeSubscription(businessId, row);
    }
    if (billingDebugEnabled()) {
      console.error("[billing] Stripe error -> DB fallback", {
        businessId,
        stripe_subscription_id: subId,
        message: err?.message ?? String(e),
      });
    }
    console.error("[subscription] erreur Stripe — repli DB", err?.message ?? e);
    return snapshotFromBusinessRowDbOnly(row);
  }
}

/**
 * Statut d’abonnement : uniquement Stripe (pas d’essai gratuit Waevon).
 * Sans abonnement Stripe valide en base → `inactive`.
 */
export async function getBusinessSubscriptionStatus(businessId: string): Promise<SubscriptionSnapshot> {
  const now = Date.now();
  const hit = cache.get(businessId);
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }

  try {
    const { row: readRow, mode } = await readBusinessBillingRowBestEffort(businessId);
    const row = readRow ?? EMPTY_ROW;
    const snapshot = await resolveStripeSnapshot(businessId, row);

    const enriched: SubscriptionSnapshot = {
      ...snapshot,
      stripeCustomerId: row.stripe_customer_id ?? snapshot.stripeCustomerId,
    };

    if (billingDebugEnabled()) {
      console.log("[billing] getBusinessSubscriptionStatus", {
        businessId,
        readMode: mode,
        dbRowFound: Boolean(readRow),
        subscription_status: row.subscription_status,
        stripe_customer_id: row.stripe_customer_id,
        stripe_subscription_id: row.stripe_subscription_id,
        snapshot: {
          status: enriched.status,
          accessSource: enriched.accessSource,
          plan: enriched.plan,
          currentPeriodEnd: enriched.currentPeriodEnd,
          cancelAtPeriodEnd: enriched.cancelAtPeriodEnd,
        },
      });
    }

    cache.set(businessId, { expiresAt: now + TTL_MS, value: enriched });
    return enriched;
  } catch (e) {
    console.error("[subscription] lecture business impossible", e);
    return SYNC_ERROR_SUBSCRIPTION_SNAPSHOT;
  }
}
