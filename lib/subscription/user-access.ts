import type { ProfileSubscriptionRow } from "@/lib/subscription/profile-subscription-override";
import type { WorkspaceTrialInfo } from "@/lib/wavon/types";

export type UserAccessCheck = {
  isTrialActive: boolean;
  isExpired: boolean;
  isSubscribed: boolean;
};

const TRIALING = "trialing";
const ACTIVE = "active";
const EXPIRED = "expired";

/**
 * Règles : abonné si profil `active` (payant enregistré) ou abonnement Stripe côté commerce déjà actif
 * (dérivé ailleurs). Ici, `isStripeSubscribed` = snapshot Stripe indique un accès payant.
 */
export function checkUserAccess(args: {
  profile: ProfileSubscriptionRow | null;
  isStripeSubscribed: boolean;
  now?: Date;
}): UserAccessCheck {
  const now = args.now ?? new Date();
  const p = args.profile;
  const status = (p?.subscription_status ?? "").trim().toLowerCase();

  if (args.isStripeSubscribed) {
    return { isTrialActive: false, isExpired: false, isSubscribed: true };
  }

  if (status === ACTIVE) {
    return { isTrialActive: false, isExpired: false, isSubscribed: true };
  }

  if (p?.trial_end) {
    const end = new Date(p.trial_end);
    if (!Number.isNaN(end.getTime()) && end > now && status === TRIALING) {
      return { isTrialActive: true, isExpired: false, isSubscribed: false };
    }
  }

  if (status === EXPIRED || (p?.trial_end && new Date(p.trial_end) <= now)) {
    return { isTrialActive: false, isExpired: true, isSubscribed: false };
  }

  if (status === TRIALING && p?.trial_end) {
    const end = new Date(p.trial_end);
    if (!Number.isNaN(end.getTime()) && end <= now) {
      return { isTrialActive: false, isExpired: true, isSubscribed: false };
    }
  }

  return { isTrialActive: false, isExpired: true, isSubscribed: false };
}

/** True si l’essai 7j est utilisable côté produit (aligné RLS : trialing + trial_end > now). */
export function isProfileFreeTrialWriteAllowed(profile: ProfileSubscriptionRow | null, now = new Date()): boolean {
  if (!profile) return false;
  const s = (profile.subscription_status ?? "").trim().toLowerCase();
  if (s !== TRIALING) return false;
  if (!profile.trial_end) return false;
  const end = new Date(profile.trial_end);
  return !Number.isNaN(end.getTime()) && end > now;
}

/** Bannière « Essai gratuit — X j restants » (sans abonnement Stripe en cours). */
export function buildWorkspaceTrialInfo(
  profile: ProfileSubscriptionRow | null,
  hasActiveStripe: boolean
): WorkspaceTrialInfo | null {
  if (hasActiveStripe) return null;
  if (!isProfileFreeTrialWriteAllowed(profile)) return null;
  if (!profile?.trial_end) return null;
  const end = new Date(profile.trial_end);
  const now = new Date();
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return null;
  const daysRemaining = Math.max(1, Math.ceil(ms / 86_400_000));
  return { trialEnd: profile.trial_end, daysRemaining };
}
