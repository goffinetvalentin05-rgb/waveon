import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBusinessSubscriptionStatus } from "@/lib/stripe/subscription";
import type { SubscriptionSnapshot } from "@/lib/wavon/types";
const MS_PER_DAY = 86_400_000;

function billingDebugEnabled(): boolean {
  return (
    (process.env.BILLING_DEBUG ?? "").trim() === "1" ||
    (process.env.NEXT_PUBLIC_BILLING_DEBUG ?? "").trim() === "1"
  );
}

function isMissingColumnError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  if (err?.code === "42703") return true;
  const msg = String(err?.message ?? "");
  return msg.toLowerCase().includes("does not exist") && msg.toLowerCase().includes("column");
}

export type WorkspaceAccessState = {
  workspaceId: string;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  hasActiveSubscription: boolean;
  hasAccess: boolean;
  daysLeft: number;
  subscriptionStatus: string;
  planName: "starter" | "pro" | null;
  snapshot: SubscriptionSnapshot;
  stripeCustomerId: string | null;
};

/** Jours restants d’essai : ceil((trial_ends_at - now) / 1 jour), jamais négatif. */
export function computeTrialDaysLeft(trialEndsAtIso: string | null, nowMs: number = Date.now()): number {
  if (!trialEndsAtIso?.trim()) return 0;
  const end = Date.parse(trialEndsAtIso);
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - nowMs) / MS_PER_DAY));
}

export function trialRemainingPhrase(daysLeft: number): string {
  const d = Math.max(0, daysLeft);
  if (d >= 3) return `Il vous reste ${d} jours d’essai.`;
  if (d === 2) return "Il vous reste 2 jours d’essai.";
  if (d === 1) return "Il vous reste 1 jour d’essai.";
  return "Dernier jour d’essai.";
}

/** Abonnement Stripe « payant / utilisable » : uniquement via snapshot (pas d’erreur sync, source Stripe). */
export function snapshotIndicatesActiveSubscription(snapshot: SubscriptionSnapshot): boolean {
  if (snapshot.status === "sync_error") return false;
  if (snapshot.accessSource !== "stripe") return false;
  return (
    snapshot.status === "active" ||
    snapshot.status === "past_due" ||
    snapshot.status === "trialing"
  );
}

async function readTrialEndsAt(businessId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  try {
    const { data, error } = await admin
      .from(WavonDbTable.businesses)
      .select("trial_ends_at")
      .eq("id", businessId)
      .maybeSingle();
    if (error) throw error;
    const raw = (data as { trial_ends_at?: string | null } | null)?.trial_ends_at;
    return typeof raw === "string" && raw.trim() ? raw : null;
  } catch (e) {
    if (isMissingColumnError(e)) return null;
    throw e;
  }
}

/**
 * Source de vérité unique pour l’accès Waevon :
 * hasAccess = abonnement Stripe actif OU essai (trial_ends_at > now).
 */
export async function getWorkspaceAccessState(workspaceId: string): Promise<WorkspaceAccessState> {
  const id = workspaceId.trim();
  const now = Date.now();

  const [trialEndsAt, snapshot] = await Promise.all([readTrialEndsAt(id), getBusinessSubscriptionStatus(id)]);

  const trialEndMs = trialEndsAt ? Date.parse(trialEndsAt) : NaN;
  const isTrialActive = Boolean(trialEndsAt && !Number.isNaN(trialEndMs) && trialEndMs > now);
  const isTrialExpired = Boolean(trialEndsAt && !Number.isNaN(trialEndMs) && trialEndMs <= now);
  const hasActiveSubscription = snapshotIndicatesActiveSubscription(snapshot);
  const hasAccess = hasActiveSubscription || isTrialActive;
  const daysLeft = computeTrialDaysLeft(trialEndsAt, now);

  if (billingDebugEnabled()) {
    console.log("[billing] getWorkspaceAccessState", {
      workspaceId: id,
      trialEndsAt,
      subscriptionStatus: snapshot.status,
      hasActiveSubscription,
      hasAccess,
      daysLeft,
      isTrialActive,
      isTrialExpired,
    });
  }

  return {
    workspaceId: id,
    trialEndsAt,
    isTrialActive,
    isTrialExpired,
    hasActiveSubscription,
    hasAccess,
    daysLeft,
    subscriptionStatus: snapshot.status,
    planName: snapshot.plan ?? null,
    snapshot,
    stripeCustomerId: snapshot.stripeCustomerId ?? null,
  };
}

/** Reconstruction côté client (après /api/subscription/live). */
export function buildWorkspaceAccessState(
  workspaceId: string,
  snapshot: SubscriptionSnapshot,
  summary: {
    trialEndsAt: string | null;
    isTrialActive: boolean;
    isTrialExpired: boolean;
    hasActiveSubscription: boolean;
    hasAccess: boolean;
    daysLeft: number;
  }
): WorkspaceAccessState {
  return {
    workspaceId,
    snapshot,
    trialEndsAt: summary.trialEndsAt,
    isTrialActive: summary.isTrialActive,
    isTrialExpired: summary.isTrialExpired,
    hasActiveSubscription: summary.hasActiveSubscription,
    hasAccess: summary.hasAccess,
    daysLeft: summary.daysLeft,
    subscriptionStatus: snapshot.status,
    planName: snapshot.plan,
    stripeCustomerId: snapshot.stripeCustomerId ?? null,
  };
}
