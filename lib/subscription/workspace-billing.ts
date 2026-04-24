import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingStatus } from "./billing-status";
import { getBillingStatusFromAccess } from "./billing-status";
import type { SubscriptionSnapshot } from "@/lib/wavon/types";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  getMerchantWorkspaceSubscriptionAccess,
  getWorkspaceSubscriptionAccess,
  type WorkspaceAccessState,
} from "./workspace-access";

export type WorkspaceBillingResult = {
  workspaceId: string;
  access: WorkspaceAccessState;
  snapshot: SubscriptionSnapshot;
  billing: BillingStatus;
  /** Abonnement Stripe utilisable (actions métier). */
  hasActiveSubscription: boolean;
  /** @deprecated Utiliser hasActiveSubscription */
  hasAccess: boolean;
  /** @deprecated Utiliser billing.publicStatus */
  status: BillingStatus["publicStatus"];
  planName: BillingStatus["plan"];
  currentPeriodEnd: string | null;
  billingMessage: string;
  canManageBilling: boolean;
};

/**
 * Point d’entrée serveur : abonnement Stripe → UI / garde-fous.
 */
export async function getWorkspaceSubscriptionStatus(workspaceId: string): Promise<WorkspaceBillingResult> {
  const id = workspaceId.trim();
  const access = await getWorkspaceSubscriptionAccess(id);
  const billing = getBillingStatusFromAccess(access);
  return {
    workspaceId: id,
    access,
    snapshot: access.snapshot,
    billing,
    hasActiveSubscription: access.hasActiveSubscription,
    hasAccess: access.hasActiveSubscription,
    status: billing.publicStatus,
    planName: billing.plan,
    currentPeriodEnd: billing.currentPeriodEnd,
    billingMessage: billing.billingMessage,
    canManageBilling: billing.canManageBilling,
  };
}

/** Session commerçant : prend en compte `profiles` (admin / plan_override) puis Stripe. */
export async function getWorkspaceSubscriptionStatusForUserSession(
  workspaceId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<WorkspaceBillingResult> {
  const id = workspaceId.trim();
  const access = await getMerchantWorkspaceSubscriptionAccess(id, { userId, supabase });
  const billing = getBillingStatusFromAccess(access);
  return {
    workspaceId: id,
    access,
    snapshot: access.snapshot,
    billing,
    hasActiveSubscription: access.hasActiveSubscription,
    hasAccess: access.hasActiveSubscription,
    status: billing.publicStatus,
    planName: billing.plan,
    currentPeriodEnd: billing.currentPeriodEnd,
    billingMessage: billing.billingMessage,
    canManageBilling: billing.canManageBilling,
  };
}

/** Sans cookie session : résout le propriétaire du commerce (service role) puis applique le même merge. */
export async function getWorkspaceSubscriptionStatusForBusinessOwner(
  workspaceId: string
): Promise<WorkspaceBillingResult> {
  const id = workspaceId.trim();
  try {
    const admin = createAdminSupabaseClient();
    const { data: biz, error } = await admin
      .from(WavonDbTable.businesses)
      .select("user_id")
      .eq("id", id)
      .maybeSingle();
    const ownerUserId = (biz as { user_id?: string | null } | null)?.user_id ?? null;
    if (!error && ownerUserId) {
      const access = await getMerchantWorkspaceSubscriptionAccess(id, { ownerUserId });
      const billing = getBillingStatusFromAccess(access);
      return {
        workspaceId: id,
        access,
        snapshot: access.snapshot,
        billing,
        hasActiveSubscription: access.hasActiveSubscription,
        hasAccess: access.hasActiveSubscription,
        status: billing.publicStatus,
        planName: billing.plan,
        currentPeriodEnd: billing.currentPeriodEnd,
        billingMessage: billing.billingMessage,
        canManageBilling: billing.canManageBilling,
      };
    }
  } catch {
    /* fallback Stripe seul */
  }
  return getWorkspaceSubscriptionStatus(id);
}

/** @deprecated Utiliser `getWorkspaceSubscriptionStatus`. */
export async function getBillingStatusForWorkspace(workspaceId: string): Promise<WorkspaceBillingResult> {
  return getWorkspaceSubscriptionStatus(workspaceId);
}
