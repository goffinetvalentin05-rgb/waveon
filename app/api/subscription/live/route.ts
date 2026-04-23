import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBillingStatusFromAccess } from "@/lib/subscription/billing-status";
import { ensureBusinessForUser } from "@/lib/wavon/ensure-business-for-user";
import { getWorkspaceAccessState } from "@/lib/subscription/workspace-access";
import { SYNC_ERROR_SUBSCRIPTION_SNAPSHOT } from "@/lib/wavon/types";

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
      return NextResponse.json({
        ...snap,
        billing: getBillingStatusFromAccess({
          workspaceId: "",
          trialEndsAt: null,
          isTrialActive: false,
          isTrialExpired: false,
          hasActiveSubscription: false,
          hasAccess: false,
          daysLeft: 0,
          subscriptionStatus: snap.status,
          planName: null,
          snapshot: snap,
          stripeCustomerId: null,
        }),
        workspaceAccess: {
          trialEndsAt: null,
          isTrialActive: false,
          isTrialExpired: false,
          hasActiveSubscription: false,
          hasAccess: false,
          daysLeft: 0,
        },
      });
    }
  }

  const access = await getWorkspaceAccessState(businessId);
  const snapshot = access.snapshot;
  const billing = getBillingStatusFromAccess(access);

  if (billingDebugEnabled()) {
    console.log("[billing] /api/subscription/live", {
      userId: user.id,
      businessId,
      trialEndsAt: access.trialEndsAt,
      hasActiveSubscription: access.hasActiveSubscription,
      hasAccess: access.hasAccess,
      daysLeft: access.daysLeft,
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
        canUseApp: billing.canUseApp,
      },
    });
  }

  return NextResponse.json({
    ...snapshot,
    billing,
    workspaceAccess: {
      trialEndsAt: access.trialEndsAt,
      isTrialActive: access.isTrialActive,
      isTrialExpired: access.isTrialExpired,
      hasActiveSubscription: access.hasActiveSubscription,
      hasAccess: access.hasAccess,
      daysLeft: access.daysLeft,
    },
  });
}
