import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getBillingStatusForWorkspace } from "./workspace-billing";

const SUBSCRIPTION_REQUIRED = {
  error: "subscription_required",
  message: "Votre essai est terminé ou votre abonnement est inactif. Souscrivez un abonnement pour continuer.",
} as const;

/** Route handler : commerce authentifié = celui du user ; 402 si BLOCKED. */
export async function merchantBillingGateResponse(): Promise<NextResponse | null> {
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
  if (bizErr || !biz) {
    return NextResponse.json({ error: "Commerce introuvable." }, { status: 400 });
  }
  const { billing } = await getBillingStatusForWorkspace((biz as { id: string }).id);
  if (!billing.canUseApp) {
    return NextResponse.json(SUBSCRIPTION_REQUIRED, { status: 402 });
  }
  return null;
}

/** Appel serveur sans session (ex. /api/emails/send avec businessId) — anti-contournement middleware. */
export async function billingGateResponseForBusinessId(businessId: string): Promise<NextResponse | null> {
  const id = businessId?.trim();
  if (!id) {
    return NextResponse.json({ error: "businessId requis." }, { status: 400 });
  }
  const { billing } = await getBillingStatusForWorkspace(id);
  if (!billing.canUseApp) {
    return NextResponse.json(SUBSCRIPTION_REQUIRED, { status: 402 });
  }
  return null;
}
