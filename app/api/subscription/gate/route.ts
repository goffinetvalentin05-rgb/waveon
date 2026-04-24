import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBillingStatusFromAccess } from "@/lib/subscription/billing-status";
import { resolveMerchantSubscription } from "@/lib/subscription/workspace-access";
import {
  fetchProfileSubscriptionRow,
  profileAccessForApi,
  workspaceProfileAccessFromInternalAdminEmail,
} from "@/lib/subscription/profile-subscription-override";
import { isInternalAdminAuthEmail } from "@/lib/subscription/effective-subscription";

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
    if (!ownerUserId) {
      return NextResponse.json(BLOCKED_PAYLOAD);
    }

    const { access, effective, profileRow, authEmail } = await resolveMerchantSubscription(businessId, {
      ownerUserId,
    });
    const profileAccess =
      profileAccessForApi(profileRow) ??
      (isInternalAdminAuthEmail(authEmail) ? workspaceProfileAccessFromInternalAdminEmail() : null);

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
        effective,
        ...(profileAccess ? { profileAccess } : {}),
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
    const profileRowNoBiz = await fetchProfileSubscriptionRow(supabase, user.id);
    const profileAccess =
      profileAccessForApi(profileRowNoBiz) ??
      (isInternalAdminAuthEmail(user.email) ? workspaceProfileAccessFromInternalAdminEmail() : null);
    return NextResponse.json({
      canUseApp: true,
      canUsePremiumFeatures: false,
      error: "Commerce introuvable.",
      state: { kind: "subscription_required" as const },
      workspaceAccess: {
        hasActiveSubscription: false,
        canUsePremiumFeatures: false,
        ...(profileAccess ? { profileAccess } : {}),
      },
    });
  }

  const businessId = (biz as { id: string }).id;
  const { access, effective, profileRow } = await resolveMerchantSubscription(businessId, {
    user: { id: user.id, email: user.email },
    supabase,
  });
  const profileAccess =
    profileAccessForApi(profileRow) ??
    (isInternalAdminAuthEmail(user.email) ? workspaceProfileAccessFromInternalAdminEmail() : null);

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
      effective,
      ...(profileAccess ? { profileAccess } : {}),
    },
    state: {
      kind: access.hasActiveSubscription ? ("active" as const) : ("subscription_required" as const),
    },
  });
}
