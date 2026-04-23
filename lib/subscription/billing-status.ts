import type { WorkspaceAccessState } from "./workspace-access";
import type { SubscriptionSnapshot } from "@/lib/wavon/types";

export type BillingPlanDisplay = "starter" | "pro" | null;

/** Statuts affichables côté produit (plus d’essai gratuit Waevon). */
export type WaevonPublicBillingStatus =
  | "active"
  | "inactive"
  | "past_due"
  | "canceled"
  | "sync_error";

export type BillingStatus = {
  status: string;
  publicStatus: WaevonPublicBillingStatus;
  label: string;
  billingMessage: string;
  /** Toujours true : le tableau de bord reste accessible en mode découverte. */
  canUseApp: boolean;
  canUsePremiumFeatures: boolean;
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
    case "active":
      return "Abonnement actif";
    case "past_due":
      return "Paiement en retard";
    case "canceled":
      return "Abonnement résilié ou inactif";
    case "sync_error":
      return "Vérification en cours";
    case "inactive":
    default:
      return "Pas d’abonnement actif";
  }
}

function deriveBillingMessage(
  publicStatus: WaevonPublicBillingStatus,
  hasActiveSubscription: boolean
): string {
  switch (publicStatus) {
    case "active":
      return "Votre abonnement est actif. Vous pouvez utiliser toutes les fonctionnalités Waevon.";
    case "past_due":
      return "Votre dernier paiement n’a pas abouti. Mettez à jour votre moyen de paiement pour conserver l’accès complet.";
    case "canceled":
      return "Votre abonnement n’est plus actif. Réabonnez-vous pour débloquer l’usage complet de Waevon.";
    case "sync_error":
      return hasActiveSubscription
        ? "Nous finalisons la synchronisation avec Stripe. Si le message persiste, actualisez la page dans un instant."
        : "Nous ne pouvons pas confirmer votre abonnement pour le moment. Actualisez la page ou réessayez plus tard.";
    case "inactive":
    default:
      return "Choisissez une offre pour débloquer toutes les fonctionnalités de Waevon (agenda, services, clients, réservations).";
  }
}

function planDisplayFromSnapshot(s: SubscriptionSnapshot): BillingPlanDisplay {
  if (s.plan === "starter" || s.plan === "pro") return s.plan;
  return null;
}

/**
 * Interprète l’état d’abonnement Stripe pour l’UI et les garde-fous métier.
 */
export function getBillingStatusFromAccess(access: WorkspaceAccessState): BillingStatus {
  const snapshot = access.snapshot;
  const stripeCustomerId = access.stripeCustomerId ?? snapshot.stripeCustomerId ?? null;
  const hasActiveSubscription = access.hasActiveSubscription;

  if (hasActiveSubscription) {
    const publicStatus = derivePublicStatus(snapshot);
    return {
      status: snapshot.status,
      publicStatus,
      label: deriveLabel(publicStatus),
      billingMessage: deriveBillingMessage(publicStatus, true),
      canUseApp: true,
      canUsePremiumFeatures: true,
      plan: planDisplayFromSnapshot(snapshot),
      currentPeriodEnd: snapshot.currentPeriodEnd,
      canManageBilling: access.canManageBilling,
      accessSource: snapshot.accessSource,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      stripeCustomerId,
    };
  }

  if (snapshot.status === "sync_error") {
    return {
      status: "sync_error",
      publicStatus: "sync_error",
      label: deriveLabel("sync_error"),
      billingMessage: deriveBillingMessage("sync_error", false),
      canUseApp: true,
      canUsePremiumFeatures: false,
      plan: null,
      currentPeriodEnd: null,
      canManageBilling: access.canManageBilling,
      accessSource: "none",
      cancelAtPeriodEnd: false,
      stripeCustomerId,
    };
  }

  const publicStatus = derivePublicStatus(snapshot);
  const safePublic = publicStatus === "sync_error" ? "inactive" : publicStatus;
  return {
    status: snapshot.status,
    publicStatus: safePublic,
    label: deriveLabel(safePublic),
    billingMessage: deriveBillingMessage(safePublic, false),
    canUseApp: true,
    canUsePremiumFeatures: false,
    plan: planDisplayFromSnapshot(snapshot),
    currentPeriodEnd: snapshot.currentPeriodEnd,
    canManageBilling: access.canManageBilling,
    accessSource: snapshot.accessSource,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    stripeCustomerId,
  };
}
