import { parseSubscriptionPlan } from "@/lib/subscription/access";
import {
  EMPTY_SUBSCRIPTION_SNAPSHOT,
  type SubscriptionAccessSource,
  type SubscriptionSnapshot,
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
