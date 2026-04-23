import type { BillingStatus } from "./billing-status";
import { getBillingStatusFromAccess } from "./billing-status";
import type { SubscriptionSnapshot } from "@/lib/wavon/types";
import { getWorkspaceAccessState, type WorkspaceAccessState } from "./workspace-access";

export type WorkspaceBillingResult = {
  workspaceId: string;
  access: WorkspaceAccessState;
  snapshot: SubscriptionSnapshot;
  billing: BillingStatus;
  hasAccess: boolean;
  /** @deprecated Utiliser billing.publicStatus */
  status: BillingStatus["publicStatus"];
  planName: BillingStatus["plan"];
  currentPeriodEnd: string | null;
  billingMessage: string;
  canManageBilling: boolean;
};

/**
 * Point d’entrée serveur : essai + abonnement Stripe → UI / garde-fous.
 */
export async function getWorkspaceSubscriptionStatus(workspaceId: string): Promise<WorkspaceBillingResult> {
  const id = workspaceId.trim();
  const access = await getWorkspaceAccessState(id);
  const billing = getBillingStatusFromAccess(access);
  return {
    workspaceId: id,
    access,
    snapshot: access.snapshot,
    billing,
    hasAccess: access.hasAccess,
    status: billing.publicStatus,
    planName: billing.plan,
    currentPeriodEnd: billing.currentPeriodEnd,
    billingMessage: billing.billingMessage,
    canManageBilling: billing.canManageBilling,
  };
}

/** @deprecated Utiliser `getWorkspaceSubscriptionStatus`. */
export async function getBillingStatusForWorkspace(workspaceId: string): Promise<WorkspaceBillingResult> {
  return getWorkspaceSubscriptionStatus(workspaceId);
}
