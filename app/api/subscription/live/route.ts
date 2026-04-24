import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBillingStatusFromAccess } from "@/lib/subscription/billing-status";
import { ensureBusinessForUser } from "@/lib/wavon/ensure-business-for-user";
import {
  getMerchantWorkspaceSubscriptionAccess,
  workspaceAccessSummaryFromSnapshot,
} from "@/lib/subscription/workspace-access";
import {
  fetchProfileSubscriptionRow,
  profileAccessForApi,
} from "@/lib/subscription/profile-subscription-override";
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

  const profileRow = await fetchProfileSubscriptionRow(supabase, user.id);
  const profileAccess = profileAccessForApi(profileRow);

  const access = await getMerchantWorkspaceSubscriptionAccess(businessId, {
    userId: user.id,
    supabase,
  });
  const snapshot = access.snapshot;
  const billing = getBillingStatusFromAccess(access);

  if (billingDebugEnabled()) {
    console.log("[billing] /api/subscription/live", {
      userId: user.id,
      businessId,
      profileOverride: Boolean(profileAccess),
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
      ...(profileAccess ? { profileAccess } : {}),
    },
  });
}
