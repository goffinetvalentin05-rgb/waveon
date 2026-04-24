import type { ProfileSubscriptionRow } from "@/lib/subscription/profile-subscription-override";

/** Compte interne : accès Pro immédiat sans Stripe (email Supabase Auth). */
export const INTERNAL_ADMIN_AUTH_EMAIL = "goffinetvalentin05@gmail.com";

/**
 * Source de vérité côté produit pour ce qui est « abonnement effectif » (hors affichage Stripe seul).
 * Dérivée par {@link getEffectiveSubscription} sur le serveur.
 */
export type EffectiveSubscription = {
  plan: "starter" | "pro" | null;
  status: string;
  isActive: boolean;
  isAdmin: boolean;
  canAccessAll: boolean;
  canUseServices: boolean;
  canUseReservations: boolean;
  canUseAvailability: boolean;
  canUseInvoices: boolean;
};

export function isInternalAdminAuthEmail(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase().trim() === INTERNAL_ADMIN_AUTH_EMAIL;
}

export function internalAdminEffectiveSubscription(): EffectiveSubscription {
  return {
    plan: "pro",
    status: "active",
    isActive: true,
    isAdmin: true,
    canAccessAll: true,
    canUseServices: true,
    canUseReservations: true,
    canUseAvailability: true,
    canUseInvoices: true,
  };
}

export function profileProEffectiveSubscription(row: ProfileSubscriptionRow): EffectiveSubscription {
  const isAdmin = (row.role ?? "").trim().toLowerCase() === "admin";
  return {
    plan: "pro",
    status: "active",
    isActive: true,
    isAdmin,
    canAccessAll: true,
    canUseServices: true,
    canUseReservations: true,
    canUseAvailability: true,
    canUseInvoices: true,
  };
}

/** À partir d’un état d’accès Stripe / DB déjà résolu (hors overrides email / profil). */
export function effectiveSubscriptionFromStripeAccess(args: {
  hasActiveSubscription: boolean;
  subscriptionStatus: string;
  planName: "starter" | "pro" | null;
}): EffectiveSubscription {
  const active = args.hasActiveSubscription;
  const plan = args.planName;
  const isPro = plan === "pro";
  return {
    plan,
    status: args.subscriptionStatus,
    isActive: active,
    isAdmin: false,
    canAccessAll: active,
    canUseServices: active,
    canUseReservations: active,
    canUseAvailability: active,
    canUseInvoices: active && isPro,
  };
}
