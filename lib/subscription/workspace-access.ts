import { getBusinessSubscriptionStatus } from "@/lib/stripe/subscription";
import type { SubscriptionSnapshot, WorkspaceAccessSummary } from "@/lib/wavon/types";

function billingDebugEnabled(): boolean {
  return (
    (process.env.BILLING_DEBUG ?? "").trim() === "1" ||
    (process.env.NEXT_PUBLIC_BILLING_DEBUG ?? "").trim() === "1"
  );
}

/** Abonnement Stripe « utilisable » : snapshot Stripe fiable uniquement. */
export function snapshotIndicatesActiveSubscription(snapshot: SubscriptionSnapshot): boolean {
  if (snapshot.status === "sync_error") return false;
  if (snapshot.accessSource !== "stripe" && snapshot.accessSource !== "admin") return false;
  return (
    snapshot.status === "active" ||
    snapshot.status === "past_due" ||
    snapshot.status === "trialing"
  );
}

export type WorkspaceAccessState = {
  workspaceId: string;
  hasActiveSubscription: boolean;
  canUsePremiumFeatures: boolean;
  canManageBilling: boolean;
  currentPeriodEnd: string | null;
  subscriptionStatus: string;
  planName: "starter" | "pro" | null;
  snapshot: SubscriptionSnapshot;
  stripeCustomerId: string | null;
};

/**
 * Résumé client à partir du snapshot Stripe uniquement.
 */
export function workspaceAccessSummaryFromSnapshot(snapshot: SubscriptionSnapshot): WorkspaceAccessSummary {
  const hasActiveSubscription = snapshotIndicatesActiveSubscription(snapshot);
  return {
    hasActiveSubscription,
    canUsePremiumFeatures: hasActiveSubscription,
  };
}

/**
 * Source de vérité pour l’abonnement : Stripe (+ cache DB via getBusinessSubscriptionStatus).
 * Mode découverte : pas d’abonnement = interface visible, fonctionnalités métier bloquées (RLS + UI).
 */
export async function getWorkspaceSubscriptionAccess(workspaceId: string): Promise<WorkspaceAccessState> {
  const id = workspaceId.trim();
  const snapshot = await getBusinessSubscriptionStatus(id);
  const hasActiveSubscription = snapshotIndicatesActiveSubscription(snapshot);
  const stripeCustomerId = snapshot.stripeCustomerId ?? null;

  if (billingDebugEnabled()) {
    console.log("[billing] getWorkspaceSubscriptionAccess", {
      workspaceId: id,
      subscriptionStatus: snapshot.status,
      hasActiveSubscription,
    });
  }

  return {
    workspaceId: id,
    hasActiveSubscription,
    canUsePremiumFeatures: hasActiveSubscription,
    canManageBilling: Boolean(stripeCustomerId?.trim()),
    currentPeriodEnd: snapshot.currentPeriodEnd ?? null,
    subscriptionStatus: snapshot.status,
    planName: snapshot.plan ?? null,
    snapshot,
    stripeCustomerId,
  };
}

/** @deprecated Utiliser {@link getWorkspaceSubscriptionAccess}. */
export async function getWorkspaceAccessState(workspaceId: string): Promise<WorkspaceAccessState> {
  return getWorkspaceSubscriptionAccess(workspaceId);
}

/** Reconstruction côté client (après /api/subscription/live). */
export function buildWorkspaceAccessState(
  workspaceId: string,
  snapshot: SubscriptionSnapshot,
  summary: WorkspaceAccessSummary
): WorkspaceAccessState {
  const hasActiveSubscription = summary.hasActiveSubscription;
  return {
    workspaceId,
    snapshot,
    hasActiveSubscription,
    canUsePremiumFeatures: summary.canUsePremiumFeatures,
    canManageBilling: snapshot.accessSource === "stripe" && Boolean(snapshot.stripeCustomerId?.trim()),
    currentPeriodEnd: snapshot.currentPeriodEnd ?? null,
    subscriptionStatus: snapshot.status,
    planName: snapshot.plan ?? null,
    stripeCustomerId: snapshot.stripeCustomerId ?? null,
  };
}
