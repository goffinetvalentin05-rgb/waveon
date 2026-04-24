import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getWorkspaceSubscriptionStatus } from "./workspace-billing";
import { isAdminUser } from "@/lib/auth/admin-emails";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const SUBSCRIPTION_REQUIRED = {
  error: "subscription_required",
  message: "Abonnement actif requis. Souscrivez depuis Facturation pour continuer.",
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
  if (isAdminUser(user)) {
    return null;
  }
  const { data: biz, error: bizErr } = await supabase
    .from(WavonDbTable.businesses)
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (bizErr || !biz) {
    return NextResponse.json({ error: "Commerce introuvable." }, { status: 400 });
  }
  const { access } = await getWorkspaceSubscriptionStatus((biz as { id: string }).id);
  if (!access.hasActiveSubscription) {
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

  try {
    const admin = createAdminSupabaseClient();
    const { data: biz } = await admin
      .from(WavonDbTable.businesses)
      .select("user_id")
      .eq("id", id)
      .maybeSingle();
    const ownerUserId = (biz as { user_id?: string | null } | null)?.user_id ?? null;
    if (ownerUserId) {
      const { data } = await admin.auth.admin.getUserById(ownerUserId);
      const owner = data?.user ?? null;
      if (owner && isAdminUser(owner)) {
        return null;
      }
    }
  } catch {
    // ignore: fallback Stripe/DB gating
  }

  const { access } = await getWorkspaceSubscriptionStatus(id);
  if (!access.hasActiveSubscription) {
    return NextResponse.json(SUBSCRIPTION_REQUIRED, { status: 402 });
  }
  return null;
}
