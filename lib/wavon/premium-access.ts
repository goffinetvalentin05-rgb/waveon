import type { WavonState, WorkspaceAccessSummary } from "@/lib/wavon/types";

/** Accès aux actions métier (écritures) : abonnement Stripe actif côté snapshot. */
export function canUsePremiumFeatures(
  access: WorkspaceAccessSummary | null | undefined
): boolean {
  return Boolean(access?.canUsePremiumFeatures ?? access?.hasActiveSubscription);
}

/** Factures Pro : plan Pro Stripe ou accès interne (profil admin / plan_override). */
export function canUseProInvoices(state: WavonState): boolean {
  if (state.subscription?.plan === "pro") return true;
  if (state.subscription?.accessSource === "admin") return true;
  if (state.workspaceAccess?.profileAccess) return true;
  return false;
}
