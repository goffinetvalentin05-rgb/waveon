import type { WorkspaceAccessSummary } from "@/lib/wavon/types";

/** Accès aux actions métier (écritures) : abonnement Stripe actif côté snapshot. */
export function canUsePremiumFeatures(
  access: WorkspaceAccessSummary | null | undefined
): boolean {
  return Boolean(access?.canUsePremiumFeatures ?? access?.hasActiveSubscription);
}
