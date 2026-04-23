import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseSubscriptionPlan } from "@/lib/subscription/access";
import {
  snapshotStatusFromDatabaseColumn,
  snapshotStatusFromStripeApi,
} from "@/lib/subscription/stripe-wavon-status";
import { getEffectiveTrialEnd } from "@/lib/subscription/trial-window";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import {
  EMPTY_SUBSCRIPTION_SNAPSHOT,
  SYNC_ERROR_SUBSCRIPTION_SNAPSHOT,
  type SubscriptionSnapshot,
} from "@/lib/wavon/types";
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
  subscription_plan: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string | null;
};

const EMPTY_ROW: BusinessBillingRow = {
  stripe_customer_id: null,
  stripe_subscription_id: null,
  subscription_plan: null,
  trial_started_at: null,
  trial_ends_at: null,
  subscription_status: null,
  current_period_end: null,
  cancel_at_period_end: null,
  created_at: null,
};

function isMissingColumnError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  // Postgres: undefined_column = 42703 (via PostgREST)
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
        "stripe_customer_id, stripe_subscription_id, subscription_plan, trial_started_at, trial_ends_at, subscription_status, current_period_end, cancel_at_period_end, created_at"
      )
      .eq("id", businessId)
      .maybeSingle();
    if (error) throw error;
    return { row: (data as BusinessBillingRow | null) ?? null, mode: "full" };
  } catch (e) {
    if (!isMissingColumnError(e)) throw e;
    // Compat : certains environnements ont un schéma incomplet (migrations non appliquées).
    // On lit un sous-ensemble permettant de déduire un vrai statut métier sans tomber en sync_error.
    const { data, error } = await admin
      .from(WavonDbTable.businesses)
      .select("stripe_customer_id, stripe_subscription_id, trial_ends_at, created_at")
      .eq("id", businessId)
      .maybeSingle();
    if (error) throw error;
    const r = (data as Partial<BusinessBillingRow> | null) ?? null;
    const row: BusinessBillingRow | null = r
      ? {
          ...EMPTY_ROW,
          stripe_customer_id: (r.stripe_customer_id as string | null) ?? null,
          stripe_subscription_id: (r.stripe_subscription_id as string | null) ?? null,
          trial_ends_at: (r.trial_ends_at as string | null) ?? null,
          created_at: (r.created_at as string | null) ?? null,
        }
      : null;
    return { row, mode: "compat" };
  }
}

/**
 * Repli quand Stripe est indisponible (clé absente, timeout, etc.) : on lit uniquement `wavon_businesses`.
 */
function snapshotFromBusinessRowDbOnly(
  businessId: string,
  row: BusinessBillingRow
): SubscriptionSnapshot {
  const subId = row.stripe_subscription_id?.trim() ?? "";
  if (!subId) {
    return buildWaevonSnapshotFromRowSync(businessId, row);
  }

  const dbSt = snapshotStatusFromDatabaseColumn(row.subscription_status);
  const base = {
    plan: parseSubscriptionPlan(row.subscription_plan),
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    accessSource: "stripe" as const,
  };

  if (dbSt && ["active", "trialing", "past_due"].includes(dbSt)) {
    return { status: dbSt, ...base };
  }
  if (dbSt === "canceled") {
    return { status: "canceled", ...base };
  }
  if (dbSt === "trial_expired") {
    return {
      status: "trial_expired",
      plan: null,
      trialEndsAt: row.trial_ends_at,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      accessSource: "waevon",
    };
  }

  console.warn("[subscription] stripe_subscription_id présent mais subscription_status DB inconnu — traité comme canceled", {
    subscription_status: row.subscription_status,
  });
  return { status: "canceled", ...base };
}

/** Branche Waevon sans appel Stripe (repli synchrone ; persistance `expired` best-effort). */
function buildWaevonSnapshotFromRowSync(businessId: string, row: BusinessBillingRow): SubscriptionSnapshot {
  const now = Date.now();
  if (row.subscription_status?.trim().toLowerCase() === "expired") {
    const eff = getEffectiveTrialEnd(row);
    return waevonTrialSnapshot(eff?.iso ?? row.trial_ends_at ?? new Date().toISOString(), true);
  }
  const eff = getEffectiveTrialEnd(row);
  if (eff) {
    const expired = eff.endMs <= now;
    if (expired) {
      void persistWaevonExpired(businessId);
    }
    return waevonTrialSnapshot(eff.iso, expired);
  }
  void persistWaevonExpired(businessId);
  return {
    ...EMPTY_SUBSCRIPTION_SNAPSHOT,
    status: "trial_expired",
    accessSource: "waevon",
  };
}

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

async function resolveWaevonTrialSnapshotAsync(
  businessId: string,
  row: BusinessBillingRow
): Promise<SubscriptionSnapshot> {
  const now = Date.now();
  if (row.subscription_status?.trim().toLowerCase() === "expired") {
    const eff = getEffectiveTrialEnd(row);
    return waevonTrialSnapshot(
      eff?.iso ?? row.trial_ends_at ?? new Date().toISOString(),
      true
    );
  }
  const eff = getEffectiveTrialEnd(row);
  if (eff) {
    const expired = eff.endMs <= now;
    if (expired) {
      await persistWaevonExpired(businessId);
      return waevonTrialSnapshot(eff.iso, true);
    }
    return waevonTrialSnapshot(eff.iso, false);
  }
  await persistWaevonExpired(businessId);
  return {
    ...EMPTY_SUBSCRIPTION_SNAPSHOT,
    status: "trial_expired",
    accessSource: "waevon",
  };
}

async function resolveStripeOrWaevonSnapshot(
  businessId: string,
  row: BusinessBillingRow
): Promise<SubscriptionSnapshot> {
  const subId = row.stripe_subscription_id?.trim() ?? "";

  if (!subId) {
    return resolveWaevonTrialSnapshotAsync(businessId, row);
  }

  if (!isStripeSecretConfigured()) {
    console.warn("[subscription] STRIPE_SECRET_KEY absente — repli colonnes DB", { businessId });
    return snapshotFromBusinessRowDbOnly(businessId, row);
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
        trial_end: sub.trial_end,
        cancel_at_period_end: sub.cancel_at_period_end,
      });
    }
    await syncStripeSubscriptionToBusinessRow(businessId, sub);
    return snapshotFromStripe(sub);
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
    return snapshotFromBusinessRowDbOnly(businessId, row);
  }
}

/**
 * Accès facturation : Stripe (live + synchro) ou essai Waevon, avec repli DB si Stripe échoue.
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
    const snapshot = await resolveStripeOrWaevonSnapshot(businessId, row);

    const enriched: SubscriptionSnapshot = {
      ...snapshot,
      trialStartedAt: row.trial_started_at ?? undefined,
      stripeCustomerId: row.stripe_customer_id ?? undefined,
    };

    if (billingDebugEnabled()) {
      console.log("[billing] getBusinessSubscriptionStatus", {
        businessId,
        readMode: mode,
        dbRowFound: Boolean(readRow),
        trial_started_at: row.trial_started_at,
        trial_ends_at: row.trial_ends_at,
        subscription_status: row.subscription_status,
        stripe_customer_id: row.stripe_customer_id,
        stripe_subscription_id: row.stripe_subscription_id,
        snapshot: {
          status: enriched.status,
          accessSource: enriched.accessSource,
          plan: enriched.plan,
          trialEndsAt: enriched.trialEndsAt,
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
