import { NextRequest, NextResponse } from "next/server";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireProInvoicesAccess } from "@/lib/subscription/require-pro-invoices-access";

export const runtime = "nodejs";

const PROJECTION =
  "auto_create_on_confirmed,company_name,company_address,company_email,company_phone,company_vat_ide,payment_terms,payment_iban,payment_account_holder,payment_bank_name,brand_color,legal_footer,updated_at";

export async function GET() {
  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;

  const { data, error } = await gate.supabase
    .from(WavonDbTable.invoiceSettings)
    .select(PROJECTION)
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
    paymentIban?: string;
    paymentAccountHolder?: string;
    paymentBankName?: string;
    brandColor?: string;
    legalFooter?: string;
  };

  const trimOrNull = (v: unknown): string | null => {
    const t = typeof v === "string" ? v.trim() : "";
    return t.length === 0 ? null : t;
  };

  const payload = {
    business_id: gate.businessId,
    auto_create_on_confirmed: Boolean(body?.autoCreateOnConfirmed ?? false),
    company_name: trimOrNull(body?.companyName),
    company_address: trimOrNull(body?.companyAddress),
    company_email: trimOrNull(body?.companyEmail),
    company_phone: trimOrNull(body?.companyPhone),
    company_vat_ide: trimOrNull(body?.companyVatIde),
    payment_terms: trimOrNull(body?.paymentTerms) ?? "Paiement à 30 jours",
    payment_iban: trimOrNull(body?.paymentIban),
    payment_account_holder: trimOrNull(body?.paymentAccountHolder),
    payment_bank_name: trimOrNull(body?.paymentBankName),
    brand_color: trimOrNull(body?.brandColor),
    legal_footer: trimOrNull(body?.legalFooter),
  };

  const { data, error } = await gate.supabase
    .from(WavonDbTable.invoiceSettings)
    .upsert(payload, { onConflict: "business_id" })
    .select(PROJECTION)
    .single();

  if (error) {
    console.error("[api/invoice-settings] upsert error:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer." }, { status: 500 });
  }

  return NextResponse.json({ invoiceSettings: data });
}
