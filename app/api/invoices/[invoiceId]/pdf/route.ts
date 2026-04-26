import { NextResponse } from "next/server";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireProInvoicesAccess } from "@/lib/subscription/require-pro-invoices-access";
import { buildInvoicePdfBuffer, type BusinessPdfRow, type InvoiceSettingsPdfRow } from "@/lib/invoices/render-invoice-pdf";
import { normalizeFileName } from "@/lib/invoices/invoice-filename";

export const runtime = "nodejs";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  service_name: string;
  service_price: number;
  line_quantity: number | null;
  currency: string;
  description: string | null;
  notes: string | null;
  issue_date: string | null;
  reservation_start_at: string;
};

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

  const { data: invoice, error: invErr } = await supabase
    .from(WavonDbTable.invoices)
    .select(
      "id,invoice_number,client_name,client_email,client_phone,service_name,service_price,line_quantity,currency,description,notes,issue_date,reservation_start_at"
    )
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (invErr || !invoice) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  const { data: business } = await supabase
    .from(WavonDbTable.businesses)
    .select("business_name,email,phone,address,city,postal_code,public_logo_url")
    .eq("id", businessId)
    .single();

  const { data: invSettings } = await supabase
    .from(WavonDbTable.invoiceSettings)
    .select(
      "company_name,company_address,company_email,company_phone,company_vat_ide,payment_terms,brand_color,legal_footer"
    )
    .eq("business_id", businessId)
    .maybeSingle();

  const inv = invoice as InvoiceRow;
  const b = (business as BusinessPdfRow) ?? ({} as BusinessPdfRow);
  const s = (invSettings as InvoiceSettingsPdfRow | null) ?? null;

  const pdf = await buildInvoicePdfBuffer({
    invoice: {
      invoice_number: inv.invoice_number,
      issue_date: inv.issue_date,
      client_name: inv.client_name,
      client_email: inv.client_email,
      client_phone: inv.client_phone,
      service_name: inv.service_name,
      service_price: inv.service_price,
      line_quantity: inv.line_quantity != null ? Number(inv.line_quantity) : 1,
      currency: inv.currency,
      description: inv.description,
      notes: inv.notes,
      reservation_start_at: inv.reservation_start_at,
    },
    business: b,
    invoiceSettings: s,
  });

  const name = `Facture-${normalizeFileName(inv.invoice_number)}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
