import { addDays, parseISO } from "date-fns";
import { WAEVON_TRIAL_DAYS } from "@/lib/stripe/config";

export type SubscriptionState =
  | { kind: "trialing"; daysLeft: number; currentDay: number }
  /** Essai inclus dans l’abonnement Stripe (durée variable selon le prix). */
  | { kind: "stripe_trialing"; daysLeft: number }
  | { kind: "trial_expired" }
  | { kind: "active"; plan: "starter" | "pro" }
  | { kind: "canceled" };

type SnapshotLike = {
  accessSource?: "waevon" | "stripe" | "none" | (string & {});
  status?: string | null;
  plan?: "starter" | "pro" | null;
  trialEndsAt?: string | null;
  trialStartedAt?: string | null;
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

  if (status === "sync_error" || (status === "none" && accessSource === "none")) {
    return { kind: "canceled" };
  }

  if (accessSource === "waevon") {
    if (status === "trialing") {
      let endIso = org?.trialEndsAt ?? null;
      if (!endIso && org?.trialStartedAt) {
        try {
          endIso = addDays(parseISO(org.trialStartedAt), WAEVON_TRIAL_DAYS).toISOString();
        } catch {
          endIso = null;
        }
      }
      if (!endIso) {
        return { kind: "trialing", daysLeft: 0, currentDay: WAEVON_TRIAL_DAYS };
      }
      const nowMs = Date.now();
      const daysLeftRaw = daysLeftFromTrialEnd(endIso, nowMs);
      const daysLeft = daysLeftRaw ?? 0;
      const currentDay = clamp(WAEVON_TRIAL_DAYS - daysLeft + 1, 1, WAEVON_TRIAL_DAYS);
      return { kind: "trialing", daysLeft, currentDay };
    }
    if (status === "trial_expired" || status === "expired") {
      return { kind: "trial_expired" };
    }
    return { kind: "canceled" };
  }

  if (accessSource === "stripe") {
    if (status === "trialing" && org?.trialEndsAt) {
      const nowMs = Date.now();
      const daysLeftRaw = daysLeftFromTrialEnd(org.trialEndsAt, nowMs);
      const daysLeft = daysLeftRaw ?? 0;
      return { kind: "stripe_trialing", daysLeft };
    }
    if (status === "active" || status === "past_due") {
      const plan = org?.plan ?? null;
      if (plan === "starter" || plan === "pro") {
        return { kind: "active", plan };
      }
      return { kind: "active", plan: "pro" };
    }
    if (status === "trialing") {
      return { kind: "stripe_trialing", daysLeft: 0 };
    }
    return { kind: "canceled" };
  }

  return { kind: "canceled" };
}

