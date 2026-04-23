import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBusinessSubscriptionStatus } from "@/lib/stripe/subscription";
import { getBillingStatus } from "@/lib/subscription/billing-status";
import { getSubscriptionState } from "@/lib/subscription/state";

export const runtime = "nodejs";

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
      return NextResponse.json({ canUseApp: false, state: { kind: "trial_expired" } });
    }
    const snapshot = await getBusinessSubscriptionStatus((biz as { id: string }).id);
    const billing = getBillingStatus(snapshot);
    const state = getSubscriptionState(snapshot);
    return NextResponse.json({ canUseApp: billing.canUseApp, billing, state });
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
    return NextResponse.json({ canUseApp: false, state: { kind: "trial_expired" } });
  }
  const snapshot = await getBusinessSubscriptionStatus((biz as { id: string }).id);
  const billing = getBillingStatus(snapshot);
  const state = getSubscriptionState(snapshot);
  return NextResponse.json({
    canUseApp: billing.canUseApp,
    billing,
    state,
    kind: state.kind,
  });
}
