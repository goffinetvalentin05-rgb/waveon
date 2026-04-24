import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBillingStatusFromAccess } from "@/lib/subscription/billing-status";
import { ensureBusinessForUser } from "@/lib/wavon/ensure-business-for-user";
import {
  getWorkspaceSubscriptionAccess,
  workspaceAccessSummaryFromSnapshot,
} from "@/lib/subscription/workspace-access";
import { SYNC_ERROR_SUBSCRIPTION_SNAPSHOT } from "@/lib/wavon/types";
import { isAdminEmail } from "@/lib/auth/admin-emails";
import { buildAdminWorkspaceAccessState } from "@/lib/subscription/admin-access";

export const runtime = "nodejs";

function billingDebugEnabled(): boolean {
  return (
    (process.env.BILLING_DEBUG ?? "").trim() === "1" ||
    (process.env.NEXT_PUBLIC_BILLING_DEBUG ?? "").trim() === "1"
  );
}

export async function GET() {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const admin = isAdminEmail(user.email);
  if (process.env.NODE_ENV !== "production") {
    console.log("[admin-access] /api/subscription/live", {
      userEmail: (user.email ?? "").toLowerCase(),
      adminEmails: (process.env.ADMIN_EMAILS ?? "").toLowerCase(),
      isAdmin: admin,
      plan: admin ? "pro" : null,
    });
  }

  if (admin) {
    const { data: biz } = await supabase
      .from(WavonDbTable.businesses)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const businessId = (biz as { id: string } | null)?.id ?? "";
    const adminAccess = buildAdminWorkspaceAccessState(businessId);
    const snapshot = adminAccess.snapshot;
    const billing = getBillingStatusFromAccess(adminAccess);
    return NextResponse.json({
      ...snapshot,
      billing,
      workspaceAccess: {
        hasActiveSubscription: true,
        canUsePremiumFeatures: true,
      },
      adminAccess: { isAdmin: true, label: "Plan Pro — accès admin interne" },
    });
  }

  const { data: biz, error: bizErr } = await supabase
    .from(WavonDbTable.businesses)
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (bizErr) {
    console.error("[subscription/live] lecture business", bizErr);
    return NextResponse.json({ error: "Impossible de charger le commerce." }, { status: 500 });
  }

  let businessId = (biz as { id: string } | null)?.id ?? null;
  if (!businessId) {
    try {
      const ensured = await ensureBusinessForUser(supabase, user.id);
      businessId = ensured.id;
    } catch (e) {
      console.error("[subscription/live] ensure business", e);
      const snap = SYNC_ERROR_SUBSCRIPTION_SNAPSHOT;
      const wa = workspaceAccessSummaryFromSnapshot(snap);
      const access = {
        workspaceId: "",
        snapshot: snap,
        hasActiveSubscription: false,
        canUsePremiumFeatures: false,
        canManageBilling: false,
        currentPeriodEnd: null,
        subscriptionStatus: snap.status,
        planName: null,
        stripeCustomerId: null,
      };
      return NextResponse.json({
        ...snap,
        billing: getBillingStatusFromAccess(access),
        workspaceAccess: wa,
      });
    }
  }

  const access = await getWorkspaceSubscriptionAccess(businessId);
  const snapshot = access.snapshot;
  const billing = getBillingStatusFromAccess(access);

  if (billingDebugEnabled()) {
    console.log("[billing] /api/subscription/live", {
      userId: user.id,
      businessId,
      hasActiveSubscription: access.hasActiveSubscription,
      snapshot: {
        status: snapshot.status,
        accessSource: snapshot.accessSource,
        plan: snapshot.plan,
        currentPeriodEnd: snapshot.currentPeriodEnd,
        cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
        stripeCustomerId: snapshot.stripeCustomerId,
      },
      billing: {
        publicStatus: billing.publicStatus,
        canUsePremiumFeatures: billing.canUsePremiumFeatures,
      },
    });
  }

  return NextResponse.json({
    ...snapshot,
    billing,
    workspaceAccess: {
      hasActiveSubscription: access.hasActiveSubscription,
      canUsePremiumFeatures: access.canUsePremiumFeatures,
    },
  });
}
