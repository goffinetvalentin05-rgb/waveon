import type { WavonState, WorkspaceAccessSummary } from "@/lib/wavon/types";

export const WAEVON_TRIAL_ENDED_MESSAGE =
  "Ton essai gratuit est terminé. Abonne-toi pour continuer.";

/** Accès aux actions métier (écritures) : snapshot + résumé serveur (`effective`). */
export function canUsePremiumFeatures(
  access: WorkspaceAccessSummary | null | undefined
): boolean {
  const eff = access?.effective;
  if (eff?.canAccessAll || eff?.isAdmin) return true;
  if (typeof eff?.canUseServices === "boolean") return eff.canUseServices;
  if (eff?.isActive) return true;
  return Boolean(access?.canUsePremiumFeatures ?? access?.hasActiveSubscription);
}

/** Message si écriture impossible (essai terminé, pas d’abonnement). */
export function messageIfWriteBlocked(access: WorkspaceAccessSummary | null | undefined): string | null {
  if (canUsePremiumFeatures(access)) return null;
  return WAEVON_TRIAL_ENDED_MESSAGE;
}

/** Factures Pro : plan Pro Stripe ou accès interne (profil admin / plan_override). */
export function canUseProInvoices(state: WavonState): boolean {
  if (state.workspaceAccess?.effective?.canUseInvoices) return true;
  if (state.subscription?.plan === "pro") return true;
  if (state.subscription?.accessSource === "admin") return true;
  if (state.workspaceAccess?.profileAccess) return true;
  return false;
}
