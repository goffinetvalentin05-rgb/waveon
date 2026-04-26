import { parseSubscriptionPlan } from "@/lib/subscription/access";
import type { EffectiveSubscription } from "@/lib/subscription/effective-subscription";
import {
  EMPTY_SUBSCRIPTION_SNAPSHOT,
  type SubscriptionAccessSource,
  type SubscriptionSnapshot,
  type WorkspaceAccessSummary,
  type WorkspaceProfileAccess,
  type WorkspaceTrialInfo,
} from "@/lib/wavon/types";

/**
 * Parse la réponse JSON de `GET /api/subscription/live` en snapshot client.
 */
export function parseSubscriptionFromLiveResponse(body: unknown): SubscriptionSnapshot {
  if (!body || typeof body !== "object") {
    return { ...EMPTY_SUBSCRIPTION_SNAPSHOT };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.error === "string" && b.error && !b.status) {
    return { ...EMPTY_SUBSCRIPTION_SNAPSHOT };
  }
  if (typeof b.status !== "string" || !b.status.length) {
    return { ...EMPTY_SUBSCRIPTION_SNAPSHOT };
  }

  const src = b.accessSource;
  const accessSource: SubscriptionAccessSource =
    src === "stripe" || src === "admin" || src === "none" ? src : "none";

  return {
    status: b.status,
    plan: parseSubscriptionPlan(
      typeof b.plan === "string" || b.plan === null ? (b.plan as string | null) : null
    ),
    currentPeriodEnd: typeof b.currentPeriodEnd === "string" ? b.currentPeriodEnd : null,
    cancelAtPeriodEnd: Boolean(b.cancelAtPeriodEnd),
    accessSource,
    ...(typeof b.stripeCustomerId === "string" ? { stripeCustomerId: b.stripeCustomerId } : {}),
  };
}

export function parseWorkspaceAccessFromLive(body: unknown): WorkspaceAccessSummary | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const w = b.workspaceAccess;
  if (!w || typeof w !== "object") return null;
  const x = w as Record<string, unknown>;

  const hasActive =
    typeof x.hasActiveSubscription === "boolean"
      ? x.hasActiveSubscription
      : typeof x.hasAccess === "boolean"
        ? x.hasAccess
        : null;
  if (hasActive === null) return null;

  let canUse =
    typeof x.canUsePremiumFeatures === "boolean" ? x.canUsePremiumFeatures : hasActive;

  let profileAccess: WorkspaceProfileAccess | null | undefined;
  const pa = x.profileAccess;
  if (pa && typeof pa === "object") {
    const p = pa as Record<string, unknown>;
    const displayLabel = typeof p.displayLabel === "string" ? p.displayLabel : null;
    if (displayLabel) {
      profileAccess = {
        displayLabel,
        isAdmin: Boolean(p.isAdmin),
        role: typeof p.role === "string" ? p.role : null,
        planOverride: typeof p.planOverride === "string" ? p.planOverride : null,
        subscriptionStatusOverride:
          typeof p.subscriptionStatusOverride === "string" ? p.subscriptionStatusOverride : null,
      };
    }
  }

  let effective: EffectiveSubscription | undefined;
  const rawEff = x.effective;
  if (rawEff && typeof rawEff === "object") {
    const e = rawEff as Record<string, unknown>;
    const planRaw = e.plan;
    const plan = planRaw === "starter" || planRaw === "pro" ? planRaw : null;
    if (typeof e.isActive === "boolean") {
      effective = {
        plan,
        status: typeof e.status === "string" ? e.status : "",
        isActive: e.isActive,
        isAdmin: Boolean(e.isAdmin),
        canAccessAll: Boolean(e.canAccessAll),
        canUseServices: Boolean(e.canUseServices),
        canUseReservations: Boolean(e.canUseReservations),
        canUseAvailability: Boolean(e.canUseAvailability),
        canUseInvoices: Boolean(e.canUseInvoices),
      };
    }
  }

  if (effective && typeof effective.canUseServices === "boolean") {
    canUse = effective.canUseServices;
  }

  let trialInfo: WorkspaceTrialInfo | null | undefined;
  const t = x.trialInfo;
  if (t && typeof t === "object") {
    const o = t as Record<string, unknown>;
    if (typeof o.trialEnd === "string" && typeof o.daysRemaining === "number") {
      trialInfo = { trialEnd: o.trialEnd, daysRemaining: o.daysRemaining };
    }
  }

  return {
    hasActiveSubscription: hasActive,
    canUsePremiumFeatures: canUse,
    ...(profileAccess ? { profileAccess } : {}),
    ...(effective ? { effective } : {}),
    trialInfo: trialInfo ?? null,
  };
}
