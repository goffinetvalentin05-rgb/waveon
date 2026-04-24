import type { ProfileSubscriptionRow } from "@/lib/subscription/profile-subscription-override";
import { profileGrantsProOverride } from "@/lib/subscription/profile-subscription-override";

/**
 * Résumé « plan effectif » quand le profil Supabase force un accès Pro (admin / plan_override).
 * Pour les utilisateurs normaux, combiner avec l’état Stripe via {@link getWorkspaceSubscriptionStatusForUserSession}.
 */
export type UserSubscriptionSummary = {
  plan: "pro";
  subscriptionStatus: string;
  isActive: true;
  isAdmin: boolean;
  canUseInvoices: true;
  canUseServices: true;
  canUseReservations: true;
  canUseAvailability: true;
};

export function userSubscriptionSummaryFromProfile(
  row: ProfileSubscriptionRow | null
): UserSubscriptionSummary | null {
  if (!profileGrantsProOverride(row)) return null;
  const isAdmin = (row!.role ?? "").trim().toLowerCase() === "admin";
  const st = (row!.subscription_status_override ?? "active").trim() || "active";
  return {
    plan: "pro",
    subscriptionStatus: st,
    isActive: true,
    isAdmin,
    canUseInvoices: true,
    canUseServices: true,
    canUseReservations: true,
    canUseAvailability: true,
  };
}
