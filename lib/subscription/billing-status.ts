import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { SubscriptionSnapshot } from "@/lib/wavon/types";
import { billingAccessStateFromSnapshot } from "./billing-access";

export type BillingPlanDisplay = "starter" | "pro" | "trial" | null;

/**
 * Statut métier unifié pour toute l’app (UI, middleware, garde API).
 * `status` reflète l’état produit (expired = essai Waevon terminé sans abonnement valide).
 */
export type BillingStatus = {
  status: string;
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysLeft: number;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  currentPeriodEnd: string | null;
  canUseApp: boolean;
  canManageBilling: boolean;
  plan: BillingPlanDisplay;
  accessSource: "waevon" | "stripe" | "none";
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  /** Résumé affichable si Stripe expose un moyen de paiement (sinon null). */
  paymentMethodLabel: string | null;
};

/** Jours restants calendaires jusqu’à la fin (minuit), jamais négatif. */
export function calendarDaysLeftUntil(isoEnd: string | null | undefined, now: Date = new Date()): number {
  if (!isoEnd) return 0;
  try {
    const endDay = startOfDay(new Date(isoEnd));
    const today = startOfDay(now);
    const d = differenceInCalendarDays(endDay, today);
    return Math.max(0, d);
  } catch {
    return 0;
  }
}

function planDisplayFromSnapshot(s: SubscriptionSnapshot): BillingPlanDisplay {
  if (s.accessSource === "waevon" && s.status === "trialing") return "trial";
  if (s.plan === "starter" || s.plan === "pro") return s.plan;
  return null;
}

/**
 * Fonction centrale dérivée du snapshot Stripe/Waevon (déjà résolu côté serveur).
 * Utiliser après `getBusinessSubscriptionStatus` ou équivalent.
 */
export function getBillingStatus(
  snapshot: SubscriptionSnapshot,
  extras?: {
    trialStartedAt?: string | null;
    stripeCustomerId?: string | null;
    paymentMethodLabel?: string | null;
  }
): BillingStatus {
  const access = billingAccessStateFromSnapshot(snapshot);
  const canUseApp = access !== "BLOCKED";

  const trialEndsAt = snapshot.trialEndsAt;
  const currentPeriodEnd = snapshot.currentPeriodEnd;

  const isWaevonTrial =
    snapshot.accessSource === "waevon" && snapshot.status === "trialing" && Boolean(trialEndsAt);
  const isStripeTrial = snapshot.accessSource === "stripe" && snapshot.status === "trialing";
  const isTrial = Boolean(isWaevonTrial || isStripeTrial);

  const isExpired = snapshot.status === "trial_expired" || snapshot.status === "expired";

  let daysLeft = 0;
  if (isTrial && trialEndsAt) {
    daysLeft = calendarDaysLeftUntil(trialEndsAt);
  }

  const isActive =
    canUseApp &&
    snapshot.accessSource === "stripe" &&
    (snapshot.status === "active" || snapshot.status === "past_due");

  return {
    status: snapshot.status === "trial_expired" ? "expired" : snapshot.status,
    isTrial,
    isActive,
    isExpired,
    daysLeft,
    trialEndsAt,
    trialStartedAt: extras?.trialStartedAt ?? snapshot.trialStartedAt ?? null,
    currentPeriodEnd,
    canUseApp,
    canManageBilling: true,
    plan: planDisplayFromSnapshot(snapshot),
    accessSource: snapshot.accessSource,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    stripeCustomerId: extras?.stripeCustomerId ?? snapshot.stripeCustomerId ?? null,
    paymentMethodLabel: extras?.paymentMethodLabel ?? null,
  };
}
