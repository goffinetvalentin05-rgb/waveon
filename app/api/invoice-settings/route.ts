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
      return { ok: false as const, res: NextResponse.json({ error: "Commerce introuvable." }, { status: 404 }) };
    }
    return { ok: true as const, supabase, businessId: business.id as string };
  }

  const { data: business } = await supabase
    .from(WavonDbTable.businesses)
    .select("id, subscription_status, subscription_plan")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!business?.id) {
    return { ok: false as const, res: NextResponse.json({ error: "Commerce introuvable." }, { status: 404 }) };
  }

  const status = String((business as { subscription_status?: unknown }).subscription_status ?? "");
  const plan = (business as { subscription_plan?: string | null }).subscription_plan ?? null;
  if (!canAccessFeature({ status, plan }, "invoices")) {
    return {
      ok: false as const,
      res: NextResponse.json(
        { error: "La création de factures est disponible avec le plan Pro.", code: "feature_locked" },
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
    .from(WavonDbTable.invoiceSettings)
    .select(
      "auto_create_on_confirmed,company_name,company_address,company_email,company_vat_ide,payment_terms,updated_at"
    )
    .eq("business_id", gate.businessId)
    .maybeSingle();

  if (error) {
    console.error("[api/invoice-settings] get error:", error);
    return NextResponse.json({ error: "Impossible de charger les paramètres." }, { status: 500 });
  }

  return NextResponse.json({ invoiceSettings: data ?? null });
}

export async function POST(req: NextRequest) {
  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;

  const body = (await req.json().catch(() => null)) as null | {
    autoCreateOnConfirmed?: boolean;
    companyName?: string;
    companyAddress?: string;
    companyEmail?: string;
    companyVatIde?: string;
    paymentTerms?: string;
  };

  const payload = {
    business_id: gate.businessId,
    auto_create_on_confirmed: Boolean(body?.autoCreateOnConfirmed ?? false),
    company_name: (body?.companyName ?? "").trim() || null,
    company_address: (body?.companyAddress ?? "").trim() || null,
    company_email: (body?.companyEmail ?? "").trim() || null,
    company_vat_ide: (body?.companyVatIde ?? "").trim() || null,
    payment_terms: (body?.paymentTerms ?? "").trim() || "Paiement à 30 jours",
  };

  const { data, error } = await gate.supabase
    .from(WavonDbTable.invoiceSettings)
    .upsert(payload, { onConflict: "business_id" })
    .select(
      "auto_create_on_confirmed,company_name,company_address,company_email,company_vat_ide,payment_terms,updated_at"
    )
    .single();

  if (error) {
    console.error("[api/invoice-settings] upsert error:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer." }, { status: 500 });
  }

  return NextResponse.json({ invoiceSettings: data });
}

