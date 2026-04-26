import type { SupabaseClient } from "@supabase/supabase-js";
import { getBusinessSubscriptionStatus } from "@/lib/stripe/subscription";
import type { SubscriptionSnapshot, WorkspaceAccessSummary } from "@/lib/wavon/types";
import { buildAdminWorkspaceAccessState } from "@/lib/subscription/admin-access";
import {
  effectiveSubscriptionFromStripeAccess,
  internalAdminEffectiveSubscription,
  isAdminTestAccount,
  profileProEffectiveSubscription,
  type EffectiveSubscription,
} from "@/lib/subscription/effective-subscription";
import { isProfileFreeTrialWriteAllowed } from "@/lib/subscription/user-access";
import {
  fetchProfileSubscriptionRow,
  profileGrantsProOverride,
  type ProfileSubscriptionRow,
} from "@/lib/subscription/profile-subscription-override";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseSubscriptionPlan } from "@/lib/subscription/access";

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
 * Abonnement effectif : après Stripe, essai 7 j sur le profil (starter) si pas encore payant.
 */
export function applyProfileFreeTrialToEffective(
  base: EffectiveSubscription,
  row: ProfileSubscriptionRow | null,
  hasActiveStripeFromBusiness: boolean
): EffectiveSubscription {
  if (hasActiveStripeFromBusiness) return base;
  if (profileGrantsProOverride(row)) {
    return row ? profileProEffectiveSubscription(row) : base;
  }
  if (isProfileFreeTrialWriteAllowed(row, new Date())) {
    const plan = parseSubscriptionPlan((row?.plan as string) ?? "starter") ?? "starter";
    return {
      plan,
      status: "trialing",
      isActive: true,
      isAdmin: false,
      canAccessAll: true,
      canUseServices: true,
      canUseReservations: true,
      canUseAvailability: true,
      canUseInvoices: false,
    };
  }
  return base;
}

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

type MerchantUserContext = { user: { id: string; email?: string | null }; supabase: SupabaseClient };

async function normalizeMerchantUserContext(
  ctx: MerchantUserContext | { ownerUserId: string }
): Promise<MerchantUserContext> {
  if ("user" in ctx) return ctx;
  const adminClient = createAdminSupabaseClient();
  const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(ctx.ownerUserId);
  const email = authErr ? null : (authData.user?.email ?? null);
  return {
    user: { id: ctx.ownerUserId, email },
    supabase: adminClient,
  };
}

/**
 * Résolution unique : email interne → profil override → Stripe.
 * Utilisée par le dashboard, le middleware (gate) et {@link getEffectiveSubscription}.
 */
export async function resolveMerchantSubscription(
  workspaceId: string,
  ctx: MerchantUserContext | { ownerUserId: string }
): Promise<{
  access: WorkspaceAccessState;
  effective: EffectiveSubscription;
  /** Ligne `profiles` lue pour ce user (`null` si court-circuit email interne). */
  profileRow: ProfileSubscriptionRow | null;
  /** Email Supabase Auth du commerçant résolu (pour garde-fous basés sur l’email). */
  authEmail: string | null;
}> {
  const id = workspaceId.trim();
  const { user, supabase } = await normalizeMerchantUserContext(ctx);
  const authEmail = user.email ?? null;

  if (isAdminTestAccount(user.email)) {
    return {
      access: buildAdminWorkspaceAccessState(id),
      effective: internalAdminEffectiveSubscription(),
      profileRow: null,
      authEmail,
    };
  }

  const row = await fetchProfileSubscriptionRow(supabase, user.id);
  if (profileGrantsProOverride(row)) {
    return {
      access: buildAdminWorkspaceAccessState(id),
      effective: profileProEffectiveSubscription(row!),
      profileRow: row,
      authEmail,
    };
  }

  const access = await getWorkspaceSubscriptionAccess(id);
  const stripeBase = effectiveSubscriptionFromStripeAccess({
    hasActiveSubscription: access.hasActiveSubscription,
    subscriptionStatus: access.subscriptionStatus,
    planName: access.planName,
  });
  return {
    access,
    effective: applyProfileFreeTrialToEffective(stripeBase, row, access.hasActiveSubscription),
    profileRow: row,
    authEmail,
  };
}

/** Source de vérité abonnement effectif (email Auth en premier, puis profil, puis Stripe). */
export async function getEffectiveSubscription(
  user: { id: string; email?: string | null },
  ctx: { workspaceId: string; supabase: SupabaseClient }
): Promise<EffectiveSubscription> {
  const { effective } = await resolveMerchantSubscription(ctx.workspaceId, { user, supabase: ctx.supabase });
  return effective;
}

/**
 * Abonnement effectif pour un commerce : email interne, overrides `profiles`, puis Stripe.
 */
export async function getMerchantWorkspaceSubscriptionAccess(
  workspaceId: string,
  ctx: MerchantUserContext | { ownerUserId: string }
): Promise<WorkspaceAccessState> {
  const { access } = await resolveMerchantSubscription(workspaceId, ctx);
  return access;
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
