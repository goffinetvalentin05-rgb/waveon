import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBillingStatusFromAccess } from "@/lib/subscription/billing-status";
import { getWorkspaceAccessState } from "@/lib/subscription/workspace-access";

export const runtime = "nodejs";

const BLOCKED_PAYLOAD = {
  canUseApp: false,
  state: { kind: "subscription_required" as const },
};

/**
 * État d’accès (middleware + réservation publique).
 * - `?slug=` : sans cookie, pour page réservation publique
 * - sans slug : cookie session requise
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim() ?? "";

  if (slug) {
    if (slug.length > 80) {
      return NextResponse.json({ canUseApp: false, blocked: true });
    }
    const admin = createAdminSupabaseClient();
    const { data: biz } = await admin
      .from(WavonDbTable.businesses)
      .select("id")
      .eq("public_slug", slug)
      .maybeSingle();
    if (!biz) {
      return NextResponse.json(BLOCKED_PAYLOAD);
    }
    const access = await getWorkspaceAccessState((biz as { id: string }).id);
    const billing = getBillingStatusFromAccess(access);
    return NextResponse.json({
      canUseApp: access.hasAccess,
      billing,
      workspaceAccess: {
        workspaceId: access.workspaceId,
        trialEndsAt: access.trialEndsAt,
        isTrialActive: access.isTrialActive,
        isTrialExpired: access.isTrialExpired,
        hasActiveSubscription: access.hasActiveSubscription,
        hasAccess: access.hasAccess,
        daysLeft: access.daysLeft,
        subscriptionStatus: access.subscriptionStatus,
        planName: access.planName,
        stripeCustomerId: access.stripeCustomerId,
      },
    });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: biz } = await supabase
    .from(WavonDbTable.businesses)
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!biz) {
    return NextResponse.json(BLOCKED_PAYLOAD);
  }
  const access = await getWorkspaceAccessState((biz as { id: string }).id);
  const billing = getBillingStatusFromAccess(access);
  return NextResponse.json({
    canUseApp: access.hasAccess,
    billing,
    workspaceAccess: {
      workspaceId: access.workspaceId,
      trialEndsAt: access.trialEndsAt,
      isTrialActive: access.isTrialActive,
      isTrialExpired: access.isTrialExpired,
      hasActiveSubscription: access.hasActiveSubscription,
      hasAccess: access.hasAccess,
      daysLeft: access.daysLeft,
      subscriptionStatus: access.subscriptionStatus,
      planName: access.planName,
      stripeCustomerId: access.stripeCustomerId,
    },
    state: { kind: access.hasAccess ? ("active" as const) : ("subscription_required" as const) },
  });
}
