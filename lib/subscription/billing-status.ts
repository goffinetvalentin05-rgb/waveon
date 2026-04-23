import { addDays, parseISO } from "date-fns";
import type { SubscriptionSnapshot } from "@/lib/wavon/types";
import { WAEVON_TRIAL_DAYS } from "@/lib/stripe/config";
import { billingAccessStateFromSnapshot } from "./billing-access";

export type BillingPlanDisplay = "starter" | "pro" | "trial" | null;

/** Statuts affichables côté produit (hors erreur technique). */
export type WaevonPublicBillingStatus =
  | "trialing"
  | "active"
  | "expired"
  | "canceled"
  | "past_due"
  | "sync_error";

/**
 * État métier unifié — utiliser `publicStatus` + `label` pour l’UI.
 * `status` reprend le snapshot brut (`trial_expired`, `trialing`, etc.).
 */
export type BillingStatus = {
  status: string;
  publicStatus: WaevonPublicBillingStatus;
  /** Libellé court pour badge / résumé (jamais « indéterminé » pour les cas métier normaux). */
  label: string;
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysLeft: number;
  trialEndsAt: string | null;
  /** Date de fin d’essai exploitable (dérivée de `trial_ends_at` ou `trial_started_at` + 7 j). */
  effectiveTrialEndsAt: string | null;
  trialStartedAt: string | null;
  currentPeriodEnd: string | null;
  canUseApp: boolean;
  canManageBilling: boolean;
  plan: BillingPlanDisplay;
  accessSource: "waevon" | "stripe" | "none";
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  paymentMethodLabel: string | null;
};

/** Jours restants (ceil), jamais négatif. */
export function daysLeftUntil(isoEnd: string | null | undefined, now: Date = new Date()): number {
  if (!isoEnd) return 0;
  try {
    const endMs = new Date(isoEnd).getTime();
    const nowMs = now.getTime();
    if (!Number.isFinite(endMs)) return 0;
    const MS_PER_DAY = 86_400_000;
    return Math.max(0, Math.ceil((endMs - nowMs) / MS_PER_DAY));
  } catch {
    return 0;
  }
}

function inferWaevonTrialEndIso(snapshot: SubscriptionSnapshot): string | null {
  if (snapshot.trialEndsAt) return snapshot.trialEndsAt;
  if (snapshot.accessSource !== "waevon" || snapshot.status !== "trialing") return null;
  if (!snapshot.trialStartedAt) return null;
  try {
    return addDays(parseISO(snapshot.trialStartedAt), WAEVON_TRIAL_DAYS).toISOString();
  } catch {
    return null;
  }
}

function planDisplayFromSnapshot(s: SubscriptionSnapshot): BillingPlanDisplay {
  if (s.accessSource === "waevon" && (s.status === "trialing" || s.status === "trial_expired")) {
    return "trial";
  }
  if (s.plan === "starter" || s.plan === "pro") return s.plan;
  return null;
}

function derivePublicStatus(snapshot: SubscriptionSnapshot): WaevonPublicBillingStatus {
  if (snapshot.status === "sync_error") return "sync_error";
  if (snapshot.status === "none" && snapshot.accessSource === "none") return "sync_error";
  if (snapshot.status === "trial_expired" || snapshot.status === "expired") return "expired";
  if (snapshot.status === "past_due") return "past_due";
  if (snapshot.status === "canceled") return "canceled";
  if (snapshot.status === "trialing") return "trialing";
  if (snapshot.status === "active") return "active";
  if (snapshot.status === "unpaid" || snapshot.status === "incomplete") return "canceled";
  return "canceled";
}

function derivePublicLabel(snapshot: SubscriptionSnapshot, publicStatus: WaevonPublicBillingStatus): string {
  switch (publicStatus) {
    case "sync_error":
      return "Synchronisation impossible pour le moment";
    case "expired":
      return "Essai expiré";
    case "past_due":
      return "Paiement en retard";
    case "canceled":
      return "Abonnement résilié ou inactif";
    case "active":
      return "Abonnement actif";
    case "trialing":
      return snapshot.accessSource === "stripe"
        ? "Période d’essai (offre)"
        : "Essai gratuit actif";
    default:
      return "Abonnement";
  }
}

/**
 * Fonction centrale : interprète le snapshot serveur (ou client) pour toute l’UI et les garde-fous.
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

  const trialStartedAt = extras?.trialStartedAt ?? snapshot.trialStartedAt ?? null;
  const trialEndsAt = snapshot.trialEndsAt;
  const effectiveTrialEndsAt =
    inferWaevonTrialEndIso({ ...snapshot, trialStartedAt: trialStartedAt ?? undefined }) ??
    trialEndsAt ??
    null;

  const isWaevonTrial = snapshot.accessSource === "waevon" && snapshot.status === "trialing";
  const isStripeTrial = snapshot.accessSource === "stripe" && snapshot.status === "trialing";
  const isTrial = isWaevonTrial || isStripeTrial;

  const isExpired = snapshot.status === "trial_expired" || snapshot.status === "expired";

  let daysLeft = 0;
  if (isTrial) {
    const endIso = effectiveTrialEndsAt ?? trialEndsAt;
    if (endIso) {
      daysLeft = daysLeftUntil(endIso);
    }
  }

  const isActive =
    canUseApp &&
    snapshot.accessSource === "stripe" &&
    (snapshot.status === "active" || snapshot.status === "past_due");

  const publicStatus = derivePublicStatus(snapshot);
  const label = derivePublicLabel(snapshot, publicStatus);

  return {
    status: snapshot.status === "trial_expired" ? "expired" : snapshot.status,
    publicStatus,
    label,
    isTrial,
    isActive,
    isExpired,
    daysLeft,
    trialEndsAt,
    effectiveTrialEndsAt,
    trialStartedAt,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    canUseApp,
    canManageBilling: true,
    plan: planDisplayFromSnapshot(snapshot),
    accessSource: snapshot.accessSource,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    stripeCustomerId: extras?.stripeCustomerId ?? snapshot.stripeCustomerId ?? null,
    paymentMethodLabel: extras?.paymentMethodLabel ?? null,
  };
}

/** Texte « jours restants » pour l’essai (Waevon ou Stripe). */
export function trialDaysRemainingPhrase(daysLeft: number): string {
  if (daysLeft <= 0) return "Dernier jour d’essai";
  if (daysLeft === 1) return "Il vous reste 1 jour d’essai";
  return `Il vous reste ${daysLeft} jours d’essai`;
}
