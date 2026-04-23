import { parseSubscriptionPlan } from "@/lib/subscription/access";
import {
  EMPTY_SUBSCRIPTION_SNAPSHOT,
  type SubscriptionAccessSource,
  type SubscriptionSnapshot,
  type WorkspaceAccessSummary,
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
  const accessSource: SubscriptionAccessSource = src === "stripe" || src === "none" ? src : "none";

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
  if (typeof x.hasAccess !== "boolean") return null;
  return {
    trialEndsAt: typeof x.trialEndsAt === "string" ? x.trialEndsAt : null,
    isTrialActive: Boolean(x.isTrialActive),
    isTrialExpired: Boolean(x.isTrialExpired),
    hasActiveSubscription: Boolean(x.hasActiveSubscription),
    hasAccess: x.hasAccess,
    daysLeft: typeof x.daysLeft === "number" && Number.isFinite(x.daysLeft) ? Math.max(0, x.daysLeft) : 0,
  };
}
