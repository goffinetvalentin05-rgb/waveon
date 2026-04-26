import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { getEffectiveSubscription } from "@/lib/subscription/workspace-access";

/**
 * Garde API factures : uniquement {@link getEffectiveSubscription} (email interne, profil, Stripe).
 */
export async function requireProInvoicesAccess(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createRouteHandlerSupabase>>; businessId: string }
  | { ok: false; res: NextResponse }
> {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, res: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  }

  const { data: business } = await supabase
    .from(WavonDbTable.businesses)
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!business?.id) {
    return { ok: false, res: NextResponse.json({ error: "Commerce introuvable." }, { status: 404 }) };
  }

  const businessId = (business as { id: string }).id;
  const effective = await getEffectiveSubscription(
    { id: user.id, email: user.email },
    { workspaceId: businessId, supabase }
  );

  if (!effective.canUseInvoices) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "La facturation est disponible avec le plan Pro.", code: "feature_locked" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, supabase, businessId };
}
