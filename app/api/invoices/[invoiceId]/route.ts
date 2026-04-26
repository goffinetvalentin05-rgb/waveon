import { NextResponse } from "next/server";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireProInvoicesAccess } from "@/lib/subscription/require-pro-invoices-access";

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

  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;
  const { supabase, businessId } = gate;

  const { data: invoice, error } = await supabase
    .from(WavonDbTable.invoices)
    .select(
      "id,business_id,reservation_id,invoice_number,status,client_name,client_email,client_phone,client_id,reservation_start_at,service_name,description,service_price,line_quantity,currency,issue_date,notes,created_at,sent_at,paid_at,cancelled_at"
    )
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (error) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  const { data: settings } = await supabase
    .from(WavonDbTable.invoiceSettings)
    .select(
      "auto_create_on_confirmed,company_name,company_address,company_email,company_phone,company_vat_ide,payment_terms,brand_color,legal_footer,updated_at"
    )
    .eq("business_id", businessId)
    .maybeSingle();

  return NextResponse.json({ invoice, invoiceSettings: settings ?? null });
}

