import type { BillingStatus } from "./billing-status";
import { getBillingStatus } from "./billing-status";
import type { SubscriptionSnapshot } from "@/lib/wavon/types";
import { getBusinessSubscriptionStatus } from "@/lib/stripe/subscription";

export type WorkspaceBillingResult = {
  workspaceId: string;
  snapshot: SubscriptionSnapshot;
  billing: BillingStatus;
};

/**
 * Source de vérité unique (serveur) pour calculer un statut métier de facturation.
 * - Lit d’abord la base (via `getBusinessSubscriptionStatus`), interroge Stripe si nécessaire
 * - Calcule un statut Waevon stable (trialing/active/expired/canceled/past_due)
 */
export async function getBillingStatusForWorkspace(workspaceId: string): Promise<WorkspaceBillingResult> {
  const id = workspaceId.trim();
  const snapshot = await getBusinessSubscriptionStatus(id);
  const billing = getBillingStatus(snapshot);
  return { workspaceId: id, snapshot, billing };
}

