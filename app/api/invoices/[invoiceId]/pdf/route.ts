import { NextResponse } from "next/server";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireProInvoicesAccess } from "@/lib/subscription/require-pro-invoices-access";
import {
  buildInvoicePdfBuffer,
  type BusinessPdfRow,
} from "@/lib/invoices/render-invoice-pdf";
import { normalizeFileName } from "@/lib/invoices/invoice-filename";
import {
  INVOICE_ITEM_PROJECTION,
  INVOICE_PROJECTION,
  mapInvoiceRow,
  mapInvoiceSettings,
  mapItemRow,
} from "@/lib/invoices/invoice-model";

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

  const { data: invoiceRow, error: invErr } = await supabase
    .from(WavonDbTable.invoices)
    .select(INVOICE_PROJECTION)
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (invErr || !invoiceRow) {
    return NextResponse.json({ error: "Cette facture est introuvable." }, { status: 404 });
  }

  const [{ data: itemRows }, { data: businessRow }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("wavon_invoice_items")
      .select(INVOICE_ITEM_PROJECTION)
      .eq("invoice_id", id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from(WavonDbTable.businesses)
      .select("business_name,email,phone,address,city,postal_code,public_logo_url,public_accent_color")
      .eq("id", businessId)
      .single(),
    supabase
      .from(WavonDbTable.invoiceSettings)
      .select(
        "company_name,company_address,company_email,company_phone,company_vat_ide,payment_terms,payment_iban,payment_account_holder,payment_bank_name,brand_color,legal_footer"
      )
      .eq("business_id", businessId)
      .maybeSingle(),
  ]);

  const invoice = mapInvoiceRow(invoiceRow as unknown as Record<string, unknown>);
  const items = (itemRows ?? []).map((r) => mapItemRow(r as unknown as Record<string, unknown>));
  const settings = mapInvoiceSettings(settingsRow as unknown as Record<string, unknown> | null);
  const business = (businessRow as unknown as BusinessPdfRow) ?? ({} as BusinessPdfRow);

  const pdf = await buildInvoicePdfBuffer({ invoice, items, business, settings });

  const baseName = `facture-${normalizeFileName(invoice.invoiceNumber || invoice.id)}`;
  const fileName = `${baseName}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
