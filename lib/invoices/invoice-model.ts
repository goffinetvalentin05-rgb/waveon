/**
 * Modèle partagé "facture" entre l’API, la page d’édition et le PDF.
 * Centralise les calculs et la résolution des champs (snapshot ↔ paramètres).
 */

import { normalizeBusinessCurrency } from "@/lib/utils/formatPrice";

export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

export type InvoiceItem = {
  id: string;
  position: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoiceRecord = {
  id: string;
  businessId: string;
  reservationId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;

  issueDate: string | null;
  dueDate: string | null;

  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;

  businessName: string | null;
  businessAddress: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  businessLogoUrl: string | null;
  businessPrimaryColor: string | null;

  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;

  notes: string | null;
  paymentTerms: string | null;

  reservationStartAt: string | null;

  createdAt: string;
  updatedAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
};

export type InvoiceWithItems = {
  invoice: InvoiceRecord;
  items: InvoiceItem[];
};

export type InvoiceSettings = {
  companyName: string | null;
  companyAddress: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyVatIde: string | null;
  paymentTerms: string;
  brandColor: string | null;
  legalFooter: string | null;
};

export const WAEVON_DEFAULT_PRIMARY = "#0a0a0a";

export function isValidHexColor(value: string | null | undefined): boolean {
  if (!value) return false;
  const t = String(value).trim();
  return /^#[0-9a-fA-F]{6}$/.test(t) || /^#[0-9a-fA-F]{3}$/.test(t);
}

export function expandHexColor(value: string | null | undefined): string | null {
  if (!isValidHexColor(value)) return null;
  const t = String(value).trim();
  if (t.length === 4) {
    return (
      "#" +
      t
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
        .toLowerCase()
    );
  }
  return t.toLowerCase();
}

/** Couleur d’affichage de la facture (préview + PDF). */
export function resolvePrimaryColor(
  invoice: Pick<InvoiceRecord, "businessPrimaryColor">,
  settings: { brandColor: string | null } | null
): string {
  return (
    expandHexColor(invoice.businessPrimaryColor) ??
    expandHexColor(settings?.brandColor ?? null) ??
    WAEVON_DEFAULT_PRIMARY
  );
}

/** Calcul de la ligne et des totaux à partir d’items en cours d’édition. */
export function recomputeTotals(
  items: Array<Pick<InvoiceItem, "quantity" | "unitPrice"> & { total?: number }>,
  discountAmount: number
): { subtotal: number; discountAmount: number; total: number } {
  const subtotal = items.reduce((acc, it) => {
    const qty = Number.isFinite(it.quantity) ? Math.max(0, Number(it.quantity)) : 0;
    const unit = Number.isFinite(it.unitPrice) ? Math.max(0, Number(it.unitPrice)) : 0;
    return acc + Math.round(qty * unit);
  }, 0);
  const safeDiscount = Math.max(0, Math.min(subtotal, Math.round(Number.isFinite(discountAmount) ? discountAmount : 0)));
  return {
    subtotal,
    discountAmount: safeDiscount,
    total: Math.max(0, subtotal - safeDiscount),
  };
}

/** Transforme une ligne SQL en `InvoiceItem`. */
export function mapItemRow(row: Record<string, unknown>): InvoiceItem {
  return {
    id: String(row.id ?? ""),
    position: Number(row.position ?? 0),
    description: typeof row.description === "string" ? row.description : "",
    quantity: Number(row.quantity ?? 1),
    unitPrice: Number(row.unit_price ?? 0),
    total: Number(row.total ?? 0),
  };
}

/** Transforme une ligne SQL en `InvoiceRecord`. */
export function mapInvoiceRow(row: Record<string, unknown>): InvoiceRecord {
  const num = (k: string) => Number(row[k] ?? 0);
  const str = (k: string) => (typeof row[k] === "string" ? (row[k] as string) : null);
  return {
    id: String(row.id ?? ""),
    businessId: String(row.business_id ?? ""),
    reservationId: row.reservation_id ? String(row.reservation_id) : null,
    invoiceNumber: typeof row.invoice_number === "string" ? row.invoice_number : "",
    status: (row.status as InvoiceStatus) ?? "draft",
    issueDate: str("issue_date"),
    dueDate: str("due_date"),
    customerName: typeof row.client_name === "string" ? row.client_name : "",
    customerEmail: str("client_email"),
    customerPhone: str("client_phone"),
    customerAddress: str("client_address"),
    businessName: str("business_name"),
    businessAddress: str("business_address"),
    businessEmail: str("business_email"),
    businessPhone: str("business_phone"),
    businessLogoUrl: str("business_logo_url"),
    businessPrimaryColor: str("business_primary_color"),
    subtotal: num("subtotal"),
    discountAmount: num("discount_amount"),
    totalAmount: num("total_amount"),
    currency: normalizeBusinessCurrency((row.currency as string | null | undefined) ?? "CHF"),
    notes: str("notes"),
    paymentTerms: str("payment_terms"),
    reservationStartAt: str("reservation_start_at"),
    createdAt: (row.created_at as string) ?? "",
    updatedAt: str("updated_at"),
    sentAt: str("sent_at"),
    paidAt: str("paid_at"),
    cancelledAt: str("cancelled_at"),
  };
}

export function mapInvoiceSettings(
  row: Record<string, unknown> | null
): InvoiceSettings | null {
  if (!row) return null;
  return {
    companyName: typeof row.company_name === "string" ? row.company_name : null,
    companyAddress: typeof row.company_address === "string" ? row.company_address : null,
    companyEmail: typeof row.company_email === "string" ? row.company_email : null,
    companyPhone: typeof row.company_phone === "string" ? row.company_phone : null,
    companyVatIde: typeof row.company_vat_ide === "string" ? row.company_vat_ide : null,
    paymentTerms:
      typeof row.payment_terms === "string" && row.payment_terms.trim().length > 0
        ? row.payment_terms
        : "Paiement à 30 jours",
    brandColor: typeof row.brand_color === "string" ? row.brand_color : null,
    legalFooter: typeof row.legal_footer === "string" ? row.legal_footer : null,
  };
}

export const INVOICE_PROJECTION =
  "id,business_id,reservation_id,invoice_number,status,client_id," +
  "client_name,client_email,client_phone,client_address," +
  "business_name,business_address,business_email,business_phone,business_logo_url,business_primary_color," +
  "issue_date,due_date,subtotal,discount_amount,total_amount,currency," +
  "notes,payment_terms,reservation_start_at," +
  "service_name,service_price,line_unit_price,line_quantity,description," +
  "created_at,updated_at,sent_at,paid_at,cancelled_at";

export const INVOICE_ITEM_PROJECTION =
  "id,invoice_id,position,description,quantity,unit_price,total,created_at,updated_at";
