import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBillingStatusFromAccess } from "@/lib/subscription/billing-status";
import { getWorkspaceSubscriptionAccess } from "@/lib/subscription/workspace-access";
import { isAdminEmail } from "@/lib/auth/admin-emails";
import { buildAdminWorkspaceAccessState } from "@/lib/subscription/admin-access";
export const runtime = "nodejs";

const BLOCKED_PAYLOAD = {
  canUseApp: false,
  canUsePremiumFeatures: false,
  state: { kind: "subscription_required" as const },
};

/**
 * État d’accès (middleware + réservation publique).
 * - `?slug=` : sans cookie, pour page réservation publique
 * - sans slug : cookie session requise — navigation dashboard toujours autorisée si connecté
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
      .select("id,user_id")
      .eq("public_slug", slug)
      .maybeSingle();
    if (!biz) {
      return NextResponse.json(BLOCKED_PAYLOAD);
    }
    const businessId = (biz as { id: string }).id;
    const ownerUserId = (biz as { user_id?: string | null }).user_id ?? null;
    if (ownerUserId) {
      try {
        const { data } = await admin.auth.admin.getUserById(ownerUserId);
        const email = data?.user?.email ?? null;
        if (isAdminEmail(email)) {
          const adminAccess = buildAdminWorkspaceAccessState(businessId);
          const billing = getBillingStatusFromAccess(adminAccess);
          return NextResponse.json({
            canUseApp: true,
            canUsePremiumFeatures: true,
            billing,
            workspaceAccess: {
              workspaceId: adminAccess.workspaceId,
              hasActiveSubscription: true,
              canUsePremiumFeatures: true,
              subscriptionStatus: adminAccess.subscriptionStatus,
              planName: adminAccess.planName,
              stripeCustomerId: null,
              currentPeriodEnd: null,
            },
          });
        }
      } catch {
        // ignore: fallback Stripe/DB gating
      }
    }

    const access = await getWorkspaceSubscriptionAccess(businessId);
    const billing = getBillingStatusFromAccess(access);
    const canBook = access.hasActiveSubscription;
    return NextResponse.json({
      canUseApp: canBook,
      canUsePremiumFeatures: canBook,
      billing,
      workspaceAccess: {
        workspaceId: access.workspaceId,
        hasActiveSubscription: access.hasActiveSubscription,
        canUsePremiumFeatures: access.canUsePremiumFeatures,
        subscriptionStatus: access.subscriptionStatus,
        planName: access.planName,
        stripeCustomerId: access.stripeCustomerId,
        currentPeriodEnd: access.currentPeriodEnd,
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

  const adminMatch = isAdminEmail(user.email);
  if (process.env.NODE_ENV !== "production") {
    console.log("[admin-access] /api/subscription/gate", {
      userEmail: (user.email ?? "").toLowerCase(),
      adminEmails: (process.env.ADMIN_EMAILS ?? "").toLowerCase(),
      isAdmin: adminMatch,
      plan: adminMatch ? "pro" : null,
    });
  }

  if (adminMatch) {
    const { data: biz } = await supabase
      .from(WavonDbTable.businesses)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const businessId = (biz as { id: string } | null)?.id ?? "";
    const adminAccess = buildAdminWorkspaceAccessState(businessId);
    const billing = getBillingStatusFromAccess(adminAccess);
    return NextResponse.json({
      canUseApp: true,
      canUsePremiumFeatures: true,
      billing,
      workspaceAccess: {
        workspaceId: adminAccess.workspaceId,
        hasActiveSubscription: true,
        canUsePremiumFeatures: true,
        subscriptionStatus: adminAccess.subscriptionStatus,
        planName: adminAccess.planName,
        stripeCustomerId: null,
        currentPeriodEnd: null,
      },
      state: { kind: "active" as const },
      adminAccess: { isAdmin: true, label: "Plan Pro — accès admin interne" },
    });
  }

  const { data: biz } = await supabase
    .from(WavonDbTable.businesses)
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!biz) {
    return NextResponse.json({
      canUseApp: true,
      canUsePremiumFeatures: false,
      error: "Commerce introuvable.",
      state: { kind: "subscription_required" as const },
    });
  }
  const access = await getWorkspaceSubscriptionAccess((biz as { id: string }).id);
  const billing = getBillingStatusFromAccess(access);
  return NextResponse.json({
    canUseApp: true,
    canUsePremiumFeatures: access.hasActiveSubscription,
    billing,
    workspaceAccess: {
      workspaceId: access.workspaceId,
      hasActiveSubscription: access.hasActiveSubscription,
      canUsePremiumFeatures: access.canUsePremiumFeatures,
      subscriptionStatus: access.subscriptionStatus,
      planName: access.planName,
      stripeCustomerId: access.stripeCustomerId,
      currentPeriodEnd: access.currentPeriodEnd,
    },
    state: {
      kind: access.hasActiveSubscription ? ("active" as const) : ("subscription_required" as const),
    },
  });
}
