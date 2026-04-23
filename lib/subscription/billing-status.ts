import type { SubscriptionSnapshot } from "@/lib/wavon/types";
import { billingAccessStateFromSnapshot } from "./billing-access";

export type BillingPlanDisplay = "starter" | "pro" | null;

/** Statuts affichables côté produit (hors erreur technique). */
export type WaevonPublicBillingStatus = "active" | "inactive" | "past_due" | "canceled" | "sync_error";

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
  if (snapshot.status === "active") return "active";
  if (snapshot.status === "inactive" || snapshot.status === "none") return "inactive";
  return "inactive";
}

function deriveLabel(publicStatus: WaevonPublicBillingStatus): string {
  switch (publicStatus) {
    case "sync_error":
      return "Synchronisation impossible pour le moment";
    case "active":
      return "Abonnement actif";
    case "past_due":
      return "Paiement en retard";
    case "canceled":
      return "Abonnement résilié ou inactif";
    case "inactive":
    default:
      return "Abonnement inactif";
  }
}

function deriveBillingMessage(publicStatus: WaevonPublicBillingStatus): string {
  switch (publicStatus) {
    case "sync_error":
      return "Une erreur technique empêche de vérifier votre abonnement. Réessayez dans un instant ou contactez le support.";
    case "active":
      return "Votre abonnement est actif. Vous avez accès à toutes les fonctionnalités Waevon.";
    case "past_due":
      return "Votre dernier paiement n’a pas abouti. Mettez à jour votre moyen de paiement pour conserver l’accès.";
    case "canceled":
      return "Votre abonnement n’est plus actif. Réabonnez-vous pour retrouver l’accès au tableau de bord.";
    case "inactive":
    default:
      return "Pour utiliser Waevon, choisissez une offre et activez votre abonnement.";
  }
}

function planDisplayFromSnapshot(s: SubscriptionSnapshot): BillingPlanDisplay {
  if (s.plan === "starter" || s.plan === "pro") return s.plan;
  return null;
}

/**
 * Interprète le snapshot (serveur ou client) pour l’UI et les garde-fous.
 */
export function getBillingStatus(
  snapshot: SubscriptionSnapshot,
  extras?: {
    stripeCustomerId?: string | null;
    paymentMethodLabel?: string | null;
  }
): BillingStatus {
  const canUseApp = billingAccessStateFromSnapshot(snapshot) !== "BLOCKED";
  const publicStatus = derivePublicStatus(snapshot);

  return {
    status: snapshot.status,
    publicStatus,
    label: deriveLabel(publicStatus),
    billingMessage: deriveBillingMessage(publicStatus),
    canUseApp,
    plan: planDisplayFromSnapshot(snapshot),
    currentPeriodEnd: snapshot.currentPeriodEnd,
    canManageBilling: true,
    accessSource: snapshot.accessSource,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    stripeCustomerId: extras?.stripeCustomerId ?? snapshot.stripeCustomerId ?? null,
  };
}
