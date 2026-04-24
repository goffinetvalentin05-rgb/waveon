import type { WorkspaceAccessState } from "@/lib/subscription/workspace-access";

export function buildAdminWorkspaceAccessState(workspaceId: string): WorkspaceAccessState {
  const id = workspaceId.trim();
  return {
    workspaceId: id,
    hasActiveSubscription: true,
    canUsePremiumFeatures: true,
    canManageBilling: false,
    currentPeriodEnd: null,
    subscriptionStatus: "active",
    planName: "pro",
    snapshot: {
      status: "active",
      plan: "pro",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      accessSource: "admin",
      stripeCustomerId: null,
    },
    stripeCustomerId: null,
  };
}

