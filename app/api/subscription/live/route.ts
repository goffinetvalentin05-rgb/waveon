import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBusinessSubscriptionStatus } from "@/lib/stripe/subscription";
import { getBillingStatus } from "@/lib/subscription/billing-status";
import { EMPTY_SUBSCRIPTION_SNAPSHOT } from "@/lib/wavon/types";

export const runtime = "nodejs";

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

  const businessId = (biz as { id: string } | null)?.id ?? null;
  if (!businessId) {
    return NextResponse.json({
      ...EMPTY_SUBSCRIPTION_SNAPSHOT,
      status: "none",
    });
  }

  try {
    const snapshot = await getBusinessSubscriptionStatus(businessId);
    const billing = getBillingStatus(snapshot);
    return NextResponse.json({ ...snapshot, billing });
  } catch (e) {
    console.error("[subscription/live] Stripe", e);
    return NextResponse.json({ error: "Erreur lors de la lecture de l’abonnement." }, { status: 500 });
  }
}
