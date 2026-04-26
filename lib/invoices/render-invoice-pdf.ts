import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { formatPrice, normalizeBusinessCurrency } from "@/lib/utils/formatPrice";

export type BusinessPdfRow = {
  business_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  public_logo_url: string | null;
};

export type InvoicePdfRow = {
  invoice_number: string;
  issue_date: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  service_name: string;
  service_price: number;
  line_unit_price?: number;
  line_quantity: number;
  total_amount?: number;
  currency: string;
  description: string | null;
  notes: string | null;
  reservation_start_at: string;
};

/** Snapshot enregistré sur la facture (état du commerce à l’émission). */
export type InvoiceBusinessSnapshot = {
  business_name: string | null;
  business_address: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_logo_url: string | null;
};

export type InvoiceSettingsPdfRow = {
  company_name: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_vat_ide: string | null;
  payment_terms: string;
  brand_color: string | null;
  legal_footer: string | null;
};

const WAEVON_ACCENT: [number, number, number] = [0.05, 0.08, 0.12];
const A4 = { w: 595.28, h: 841.89 };

function hexToRgb01(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const t = String(hex).trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(t)) return null;
  const h = t.length === 3 ? t.split("").map((c) => c + c).join("") : t;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return [r, g, b];
}

function formatDateFr(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return "—";
  try {
    const d = new Date(isoOrDate.length <= 10 ? `${isoOrDate}T12:00:00` : isoOrDate);
    return d.toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatTimeFr(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function businessAddressBlock(
  b: BusinessPdfRow,
  settings: InvoiceSettingsPdfRow | null,
  snapshotBlock: string | null | undefined
): string {
  if (settings?.company_address?.trim()) return settings.company_address.trim();
  if (snapshotBlock?.trim()) return snapshotBlock.trim();
  const parts: string[] = [];
  if (b.address?.trim()) parts.push(b.address.trim());
  const line = [b.postal_code?.trim(), b.city?.trim()].filter(Boolean).join(" ");
  if (line) parts.push(line);
  return parts.join("\n");
}

function wrapLines(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxLen) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

async function embedPublicLogo(
  pdf: PDFDocument,
  url: string | null | undefined
): Promise<{ image: PDFImage; w: number; h: number } | null> {
  const u = (url ?? "").trim();
  if (!u.startsWith("http")) return null;
  try {
    const r = await fetch(u, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    const isPng = r.headers.get("content-type")?.includes("png") || u.toLowerCase().includes(".png");
    const image = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
    const maxW = 130;
    const maxH = 48;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    return { image, w: image.width * scale, h: image.height * scale };
  } catch {
    return null;
  }
}

export async function buildInvoicePdfBuffer(args: {
  invoice: InvoicePdfRow;
  business: BusinessPdfRow;
  invoiceSettings: InvoiceSettingsPdfRow | null;
  /** Préféré pour le PDF (aligné sur le moment de la facturation). */
  businessOnInvoice: InvoiceBusinessSnapshot | null;
}): Promise<Uint8Array> {
  const { invoice, business, invoiceSettings: s, businessOnInvoice: snap } = args;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = hexToRgb01(s?.brand_color ?? null) ?? WAEVON_ACCENT;
  const accentPdf = rgb(accent[0], accent[1], accent[2]);
  const dark = rgb(0.12, 0.12, 0.12);
  const gray = rgb(0.38, 0.38, 0.38);
  const lightRule = rgb(0.9, 0.9, 0.9);

  let y = A4.h - 44;
  const left = 48;
  const right = A4.w - 48;
  const brandName =
    s?.company_name?.trim() || snap?.business_name?.trim() || business.business_name?.trim() || "Entreprise";

  const logoUrl = snap?.business_logo_url?.trim() || business.public_logo_url;
  const logo = await embedPublicLogo(pdf, logoUrl);
  if (logo) {
    page.drawImage(logo.image, { x: left, y: y - logo.h, width: logo.w, height: logo.h });
    y -= logo.h + 10;
  }

  page.drawText(brandName, { x: left, y, size: 16, font: fontBold, color: dark });
  y -= 20;

  const addr = businessAddressBlock(business, s, snap?.business_address);
  if (addr) {
    for (const line of addr.split("\n")) {
      page.drawText(line, { x: left, y, size: 9, font, color: gray });
      y -= 12;
    }
  }
  const em = s?.company_email?.trim() || snap?.business_email?.trim() || business.email?.trim();
  if (em) {
    page.drawText(em, { x: left, y, size: 9, font, color: gray });
    y -= 12;
  }
  const ph = s?.company_phone?.trim() || snap?.business_phone?.trim() || business.phone?.trim();
  if (ph) {
    page.drawText(ph, { x: left, y, size: 9, font, color: gray });
    y -= 12;
  }
  y -= 6;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 2, color: accentPdf });
  y -= 22;

  page.drawText("Facture", { x: left, y, size: 20, font: fontBold, color: dark });
  const numW = fontBold.widthOfTextAtSize(invoice.invoice_number, 12);
  page.drawText(invoice.invoice_number, { x: right - numW, y, size: 12, font: fontBold, color: dark });
  y -= 26;

  const cur = normalizeBusinessCurrency(invoice.currency);
  const issueStr = formatDateFr(invoice.issue_date ?? null);
  page.drawText(`Date d’émission : ${issueStr}`, { x: left, y, size: 10, font, color: dark });
  y -= 16;
  if (s?.company_vat_ide?.trim()) {
    page.drawText(`IDE / TVA : ${s.company_vat_ide.trim()}`, { x: left, y, size: 9, font, color: gray });
    y -= 14;
  }
  y -= 8;

  page.drawText("Client", { x: left, y, size: 10, font: fontBold, color: dark });
  y -= 14;
  page.drawText(invoice.client_name || "—", { x: left, y, size: 10, font, color: dark });
  y -= 12;
  if (invoice.client_email) {
    page.drawText(invoice.client_email, { x: left, y, size: 9, font, color: gray });
    y -= 11;
  }
  if (invoice.client_phone) {
    page.drawText(invoice.client_phone, { x: left, y, size: 9, font, color: gray });
    y -= 11;
  }
  y -= 16;

  const qty = Number(invoice.line_quantity) > 0 ? Number(invoice.line_quantity) : 1;
  const total = Number(
    typeof invoice.total_amount === "number" && invoice.total_amount > 0 ? invoice.total_amount : invoice.service_price
  ) || 0;
  const unit =
    typeof invoice.line_unit_price === "number" && invoice.line_unit_price > 0
      ? invoice.line_unit_price
      : total / qty;
  const timePart = formatTimeFr(invoice.reservation_start_at);
  const appt = `Rendez-vous le ${formatDateFr(invoice.reservation_start_at)}${timePart ? ` à ${timePart}` : ""}`;

  const desc = [invoice.service_name || "Service", invoice.description?.trim() ? ` — ${invoice.description.trim()}` : ""].join("");

  page.drawText("Prestation", { x: left, y, size: 10, font: fontBold, color: dark });
  y -= 14;
  for (const ln of wrapLines(desc, 80)) {
    page.drawText(ln, { x: left, y, size: 9, font, color: dark });
    y -= 11;
  }
  page.drawText(appt, { x: left, y, size: 8, font, color: gray });
  y -= 22;

  const headY = y;
  page.drawText("Description", { x: left, y: headY, size: 8, font: fontBold, color: gray });
  page.drawText("Qté", { x: 300, y: headY, size: 8, font: fontBold, color: gray });
  page.drawText("Prix unit.", { x: 350, y: headY, size: 8, font: fontBold, color: gray });
  page.drawText("Total", { x: 480, y: headY, size: 8, font: fontBold, color: gray });
  y = headY - 6;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: lightRule });
  y -= 12;
  const rowH = 12;
  page.drawText((invoice.service_name || "Service").slice(0, 48), { x: left, y, size: 9, font, color: dark });
  page.drawText(String(qty), { x: 300, y, size: 9, font, color: dark });
  page.drawText(formatPrice(unit, cur), { x: 350, y, size: 9, font, color: dark });
  page.drawText(formatPrice(total, cur), { x: 480, y, size: 9, font: fontBold, color: dark });
  y -= rowH;
  y -= 10;
  page.drawLine({ start: { x: 350, y: y + 4 }, end: { x: right, y: y + 4 }, thickness: 1, color: lightRule });
  page.drawText("Total", { x: 350, y, size: 10, font: fontBold, color: dark });
  const totalW = fontBold.widthOfTextAtSize(formatPrice(total, cur), 11);
  page.drawText(formatPrice(total, cur), { x: right - totalW, y, size: 11, font: fontBold, color: dark });
  y -= 24;

  if (s?.payment_terms?.trim()) {
    page.drawText("Conditions de paiement", { x: left, y, size: 9, font: fontBold, color: dark });
    y -= 12;
    for (const ln of wrapLines(s.payment_terms.trim(), 90)) {
      page.drawText(ln, { x: left, y, size: 8, font, color: gray });
      y -= 10;
    }
    y -= 6;
  }

  if (invoice.notes?.trim()) {
    page.drawText("Notes", { x: left, y, size: 9, font: fontBold, color: dark });
    y -= 12;
    for (const ln of wrapLines(invoice.notes.trim(), 88)) {
      page.drawText(ln, { x: left, y, size: 8, font, color: gray });
      y -= 10;
    }
    y -= 6;
  }

  if (s?.legal_footer?.trim()) {
    for (const ln of wrapLines(s.legal_footer.trim(), 95)) {
      page.drawText(ln, { x: left, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
      y -= 9;
    }
    y -= 4;
  }

  y = Math.max(68, y - 6);
  page.drawText("Merci pour votre confiance.", { x: left, y, size: 10, font: fontBold, color: accentPdf });
  y -= 12;
  page.drawText("Document généré par Waevon", { x: left, y, size: 7, font, color: rgb(0.6, 0.6, 0.6) });

  return pdf.save();
}
