import type { WavonState, WorkspaceAccessSummary } from "@/lib/wavon/types";

/** Accès aux actions métier (écritures) : snapshot + résumé serveur (`effective`). */
export function canUsePremiumFeatures(
  access: WorkspaceAccessSummary | null | undefined
): boolean {
  const eff = access?.effective;
  if (eff?.isActive || eff?.canAccessAll || eff?.isAdmin) return true;
  return Boolean(access?.canUsePremiumFeatures ?? access?.hasActiveSubscription);
}

/** Factures Pro : plan Pro Stripe ou accès interne (profil admin / plan_override). */
export function canUseProInvoices(state: WavonState): boolean {
  if (state.workspaceAccess?.effective?.canUseInvoices) return true;
  if (state.subscription?.plan === "pro") return true;
  if (state.subscription?.accessSource === "admin") return true;
  if (state.workspaceAccess?.profileAccess) return true;
  return false;
}
