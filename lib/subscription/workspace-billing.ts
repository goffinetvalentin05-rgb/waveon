import type { BillingStatus } from "./billing-status";
import { getBillingStatus } from "./billing-status";
import type { SubscriptionSnapshot } from "@/lib/wavon/types";
import { getBusinessSubscriptionStatus } from "@/lib/stripe/subscription";

export type WorkspaceBillingResult = {
  workspaceId: string;
  snapshot: SubscriptionSnapshot;
  billing: BillingStatus;
  /** Alias métier */
  hasAccess: boolean;
  status: BillingStatus["publicStatus"];
  planName: BillingStatus["plan"];
  currentPeriodEnd: string | null;
  billingMessage: string;
  canManageBilling: boolean;
};

/**
 * Point d’entrée serveur unique : statut d’abonnement Stripe + accès produit.
 */
export async function getWorkspaceSubscriptionStatus(workspaceId: string): Promise<WorkspaceBillingResult> {
  const id = workspaceId.trim();
  const snapshot = await getBusinessSubscriptionStatus(id);
  const billing = getBillingStatus(snapshot);
  return {
    workspaceId: id,
    snapshot,
    billing,
    hasAccess: billing.canUseApp,
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
