import type { WorkspaceAccessState } from "./workspace-access";
import {
  computeTrialDayNumberForDisplay,
  trialDaysLeftShortLabel,
  WAEVON_TRIAL_DURATION_DAYS,
} from "./workspace-access";
import type { SubscriptionSnapshot } from "@/lib/wavon/types";

export type BillingPlanDisplay = "starter" | "pro" | null;

/** Statuts affichables côté produit. */
export type WaevonPublicBillingStatus =
  | "active"
  | "inactive"
  | "past_due"
  | "canceled"
  | "sync_error"
  | "trial_active"
  | "trial_expired";

export type BillingStatus = {
  status: string;
  publicStatus: WaevonPublicBillingStatus;
  label: string;
  /** Message long pour blocs facturation / onboarding. */
  billingMessage: string;
  canUseApp: boolean;
  plan: BillingPlanDisplay;
  currentPeriodEnd: string | null;
  canManageBilling: boolean;
  accessSource: "stripe" | "none";
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
};

function derivePublicStatus(snapshot: SubscriptionSnapshot): WaevonPublicBillingStatus {
  if (snapshot.status === "sync_error") return "sync_error";
  if (snapshot.status === "past_due") return "past_due";
  if (snapshot.status === "canceled") return "canceled";
  if (snapshot.status === "active" || snapshot.status === "trialing") return "active";
  if (snapshot.status === "inactive" || snapshot.status === "none") return "inactive";
  return "inactive";
}

function deriveLabel(publicStatus: WaevonPublicBillingStatus): string {
  switch (publicStatus) {
    case "trial_active":
      return "Essai gratuit actif";
    case "trial_expired":
      return "Essai expiré";
    case "active":
      return "Abonnement actif";
    case "past_due":
      return "Paiement en retard";
    case "canceled":
      return "Abonnement résilié ou inactif";
    case "sync_error":
      return "Erreur technique";
    case "inactive":
    default:
      return "Abonnement inactif";
  }
}

function deriveBillingMessage(publicStatus: WaevonPublicBillingStatus): string {
  switch (publicStatus) {
    case "trial_active":
      return "Votre essai gratuit est en cours.";
    case "trial_expired":
      return "Votre essai gratuit est terminé. Choisissez une offre pour continuer à utiliser Waevon.";
    case "active":
      return "Votre abonnement est actif. Vous avez accès à toutes les fonctionnalités Waevon.";
    case "past_due":
      return "Votre dernier paiement n’a pas abouti. Mettez à jour votre moyen de paiement pour conserver l’accès.";
    case "canceled":
      return "Votre abonnement n’est plus actif. Réabonnez-vous pour retrouver l’accès au tableau de bord.";
    case "sync_error":
      return "Une erreur technique empêche de vérifier votre abonnement. Réessayez dans un instant ou contactez le support.";
    case "inactive":
    default:
      return "Pour utiliser Waevon, choisissez une offre et activez votre abonnement.";
  }
}

function planDisplayFromSnapshot(s: SubscriptionSnapshot): BillingPlanDisplay {
  if (s.plan === "starter" || s.plan === "pro") return s.plan;
  return null;
}

function formatTrialEndDateFr(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

/**
 * Interprète l’état d’accès (essai + Stripe) pour l’UI et les garde-fous.
 * À utiliser partout à la place de l’ancienne logique snapshot seul.
 */
export function getBillingStatusFromAccess(access: WorkspaceAccessState): BillingStatus {
  const snapshot = access.snapshot;
  const stripeCustomerId = access.stripeCustomerId ?? snapshot.stripeCustomerId ?? null;

  if (access.hasActiveSubscription) {
    const publicStatus = derivePublicStatus(snapshot);
    return {
      status: snapshot.status,
      publicStatus,
      label: deriveLabel(publicStatus),
      billingMessage: deriveBillingMessage(publicStatus),
      canUseApp: access.hasAccess,
      plan: planDisplayFromSnapshot(snapshot),
      currentPeriodEnd: snapshot.currentPeriodEnd,
      canManageBilling: true,
      accessSource: snapshot.accessSource,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      stripeCustomerId,
    };
  }

  if (access.isTrialActive) {
    const endFmt = formatTrialEndDateFr(access.trialEndsAt);
    const daysLine = trialDaysLeftShortLabel(access.daysLeft);
    const dayNum = computeTrialDayNumberForDisplay(access.daysLeft, access.isTrialActive);
    const parts: string[] = ["Essai gratuit en cours.", `${daysLine}.`];
    if (dayNum != null) {
      if (access.daysLeft <= 0) parts.push("Dernier jour d’essai.");
      else parts.push(`Jour ${dayNum} sur ${WAEVON_TRIAL_DURATION_DAYS}.`);
    }
    if (endFmt) parts.push(`Votre essai se termine le ${endFmt}.`);
    const billingMessage = parts.join(" ");
    return {
      status: "trial_waevon",
      publicStatus: "trial_active",
      label: "Essai gratuit actif",
      billingMessage,
      canUseApp: true,
      plan: null,
      currentPeriodEnd: null,
      canManageBilling: true,
      accessSource: "none",
      cancelAtPeriodEnd: false,
      stripeCustomerId,
    };
  }

  if (access.isTrialExpired) {
    return {
      status: "inactive",
      publicStatus: "trial_expired",
      label: "Essai expiré",
      billingMessage: deriveBillingMessage("trial_expired"),
      canUseApp: false,
      plan: null,
      currentPeriodEnd: null,
      canManageBilling: true,
      accessSource: "none",
      cancelAtPeriodEnd: false,
      stripeCustomerId,
    };
  }

  if (snapshot.status === "sync_error") {
    return {
      status: "sync_error",
      publicStatus: "sync_error",
      label: deriveLabel("sync_error"),
      billingMessage: deriveBillingMessage("sync_error"),
      canUseApp: false,
      plan: null,
      currentPeriodEnd: null,
      canManageBilling: true,
      accessSource: "none",
      cancelAtPeriodEnd: false,
      stripeCustomerId,
    };
  }

  const publicStatus = derivePublicStatus(snapshot);
  return {
    status: snapshot.status,
    publicStatus: publicStatus === "sync_error" ? "inactive" : publicStatus,
    label: deriveLabel(publicStatus === "sync_error" ? "inactive" : publicStatus),
    billingMessage: deriveBillingMessage(publicStatus === "sync_error" ? "inactive" : publicStatus),
    canUseApp: access.hasAccess,
    plan: planDisplayFromSnapshot(snapshot),
    currentPeriodEnd: snapshot.currentPeriodEnd,
    canManageBilling: true,
    accessSource: snapshot.accessSource,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    stripeCustomerId,
  };
}
