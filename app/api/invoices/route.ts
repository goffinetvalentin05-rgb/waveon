import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { canAccessFeature } from "@/lib/subscription/access";
import {
  fetchProfileSubscriptionRow,
  profileGrantsProOverride,
} from "@/lib/subscription/profile-subscription-override";

export const runtime = "nodejs";

async function requireProInvoicesAccess() {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false as const, res: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  }

  const profileRow = await fetchProfileSubscriptionRow(supabase, user.id);
  if (profileGrantsProOverride(profileRow)) {
    const { data: business } = await supabase
      .from(WavonDbTable.businesses)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!business?.id) {
      return {
        ok: false as const,
        res: NextResponse.json({ error: "Commerce introuvable." }, { status: 404 }),
      };
    }
    return { ok: true as const, supabase, businessId: business.id as string };
  }

  const { data: business, error: bizErr } = await supabase
    .from(WavonDbTable.businesses)
    .select("id, subscription_status, subscription_plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (bizErr || !business?.id) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Commerce introuvable." }, { status: 404 }),
    };
  }

  const status = String((business as { subscription_status?: unknown }).subscription_status ?? "");
  const plan = (business as { subscription_plan?: string | null }).subscription_plan ?? null;
  const allowed = canAccessFeature({ status, plan }, "invoices");
  if (!allowed) {
    return {
      ok: false as const,
      res: NextResponse.json(
        {
          error: "La création de factures est disponible avec le plan Pro.",
          code: "feature_locked",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, supabase, businessId: business.id as string };
}

export async function GET() {
  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;

  const { data, error } = await gate.supabase
    .from(WavonDbTable.invoices)
    .select(
      "id,invoice_number,status,client_name,service_name,service_price,currency,reservation_start_at,created_at"
    )
    .eq("business_id", gate.businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[api/invoices] list error:", error);
    return NextResponse.json({ error: "Impossible de charger les factures." }, { status: 500 });
  }

  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(req: NextRequest) {
  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;

  const body = (await req.json().catch(() => null)) as null | { reservationId?: string };
  const reservationId = body?.reservationId?.trim() ?? "";
  if (!reservationId) {
    return NextResponse.json({ error: "reservationId requis." }, { status: 400 });
  }

  const { data, error } = await gate.supabase.rpc("wavon_create_invoice_from_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) {
    console.error("[api/invoices] rpc create error:", error);
    // Si la facture existe déjà, on tente de la retrouver.
    const { data: existing } = await gate.supabase
      .from(WavonDbTable.invoices)
      .select("id")
      .eq("business_id", gate.businessId)
      .eq("reservation_id", reservationId)
      .maybeSingle();
    if (existing?.id) return NextResponse.json({ id: existing.id, existed: true });
    return NextResponse.json({ error: "Impossible de créer la facture." }, { status: 500 });
  }

  const invoiceId = typeof data === "string" ? data : null;
  if (!invoiceId) {
    return NextResponse.json({ error: "Réponse serveur invalide." }, { status: 500 });
  }
  return NextResponse.json({ id: invoiceId });
}

