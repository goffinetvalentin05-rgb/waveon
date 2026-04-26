import { NextRequest, NextResponse } from "next/server";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireProInvoicesAccess } from "@/lib/subscription/require-pro-invoices-access";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;

  const { data, error } = await gate.supabase
    .from(WavonDbTable.invoiceSettings)
    .select(
      "auto_create_on_confirmed,company_name,company_address,company_email,company_phone,company_vat_ide,payment_terms,brand_color,legal_footer,updated_at"
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
    companyPhone?: string;
    companyVatIde?: string;
    paymentTerms?: string;
    brandColor?: string;
    legalFooter?: string;
  };

  const payload = {
    business_id: gate.businessId,
    auto_create_on_confirmed: Boolean(body?.autoCreateOnConfirmed ?? false),
    company_name: (body?.companyName ?? "").trim() || null,
    company_address: (body?.companyAddress ?? "").trim() || null,
    company_email: (body?.companyEmail ?? "").trim() || null,
    company_phone: (body?.companyPhone ?? "").trim() || null,
    company_vat_ide: (body?.companyVatIde ?? "").trim() || null,
    payment_terms: (body?.paymentTerms ?? "").trim() || "Paiement à 30 jours",
    brand_color: (body?.brandColor ?? "").trim() || null,
    legal_footer: (body?.legalFooter ?? "").trim() || null,
  };

  const { data, error } = await gate.supabase
    .from(WavonDbTable.invoiceSettings)
    .upsert(payload, { onConflict: "business_id" })
    .select(
      "auto_create_on_confirmed,company_name,company_address,company_email,company_phone,company_vat_ide,payment_terms,brand_color,legal_footer,updated_at"
    )
    .single();

  if (error) {
    console.error("[api/invoice-settings] upsert error:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer." }, { status: 500 });
  }

  return NextResponse.json({ invoiceSettings: data });
}

