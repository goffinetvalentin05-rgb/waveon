import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { canAccessFeature } from "@/lib/subscription/access";
import {
  fetchProfileSubscriptionRow,
  profileGrantsProOverride,
} from "@/lib/subscription/profile-subscription-override";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const id = (invoiceId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "invoiceId manquant." }, { status: 400 });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: business } = await supabase
    .from(WavonDbTable.businesses)
    .select("id, subscription_status, subscription_plan")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!business?.id) {
    return NextResponse.json({ error: "Commerce introuvable." }, { status: 404 });
  }

  const profileRow = await fetchProfileSubscriptionRow(supabase, user.id);
  if (!profileGrantsProOverride(profileRow)) {
    const status = String((business as { subscription_status?: unknown }).subscription_status ?? "");
    const plan = (business as { subscription_plan?: string | null }).subscription_plan ?? null;
    if (!canAccessFeature({ status, plan }, "invoices")) {
      return NextResponse.json(
        { error: "La création de factures est disponible avec le plan Pro.", code: "feature_locked" },
        { status: 403 }
      );
    }
  }

  const { data: invoice, error } = await supabase
    .from(WavonDbTable.invoices)
    .select(
      "id,business_id,reservation_id,invoice_number,status,client_name,client_email,client_phone,reservation_start_at,service_name,service_price,currency,created_at,sent_at,paid_at,cancelled_at"
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  const { data: settings } = await supabase
    .from(WavonDbTable.invoiceSettings)
    .select(
      "auto_create_on_confirmed,company_name,company_address,company_email,company_vat_ide,payment_terms,updated_at"
    )
    .eq("business_id", business.id)
    .maybeSingle();

  return NextResponse.json({ invoice, invoiceSettings: settings ?? null });
}

