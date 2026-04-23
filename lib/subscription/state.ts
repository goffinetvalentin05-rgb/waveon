import { WAEVON_TRIAL_DAYS } from "@/lib/stripe/config";

export type SubscriptionState =
  | { kind: "trialing"; daysLeft: number; currentDay: number }
  | { kind: "trial_expired" }
  | { kind: "active"; plan: "starter" | "pro" }
  | { kind: "canceled" };

type SnapshotLike = {
  accessSource?: "waevon" | "stripe" | "none" | (string & {});
  status?: string | null;
  plan?: "starter" | "pro" | null;
  trialEndsAt?: string | null;
};

const MS_PER_DAY = 86_400_000;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function daysLeftFromTrialEnd(trialEndsAtIso: string, nowMs: number): number | null {
  const endMs = new Date(trialEndsAtIso).getTime();
  if (!Number.isFinite(endMs)) return null;
  const diff = endMs - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}

/**
 * Helper unique d’état d’abonnement/trial, utilisé partout (UI + middleware).
 * - Trial Waevon = `accessSource: waevon` + `status: trialing`
 * - Active = Stripe `active` (ou `trialing` Stripe) avec plan starter/pro résolu
 * - Expiré = `status: trial_expired`
 */
export function getSubscriptionState(org: SnapshotLike | null | undefined): SubscriptionState {
  const accessSource = org?.accessSource ?? "none";
  const status = org?.status ?? "none";

  if (accessSource === "waevon") {
    if (status === "trialing" && org?.trialEndsAt) {
      const nowMs = Date.now();
      const daysLeftRaw = daysLeftFromTrialEnd(org.trialEndsAt, nowMs);
      const daysLeft = daysLeftRaw ?? 0;
      const currentDay = clamp(WAEVON_TRIAL_DAYS - daysLeft + 1, 1, WAEVON_TRIAL_DAYS);
      return { kind: "trialing", daysLeft, currentDay };
    }
    if (status === "trial_expired") {
      return { kind: "trial_expired" };
    }
    return { kind: "canceled" };
  }

  if (accessSource === "stripe") {
    if (status === "active" || status === "trialing" || status === "past_due") {
      const plan = org?.plan ?? null;
      if (plan === "starter" || plan === "pro") {
        return { kind: "active", plan };
      }
      // Abonnement Stripe sans plan reconnu : on ne bloque pas, mais on ne peut pas étiqueter le plan.
      return { kind: "active", plan: "pro" };
    }
    return { kind: "canceled" };
  }

  return { kind: "canceled" };
}

