import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFPage } from "pdf-lib";
import { formatPrice, normalizeBusinessCurrency } from "@/lib/utils/formatPrice";
import {
  expandHexColor,
  resolvePrimaryColor,
  type InvoiceItem,
  type InvoiceRecord,
  type InvoiceSettings,
} from "@/lib/invoices/invoice-model";

export type BusinessPdfRow = {
  business_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  public_logo_url: string | null;
  public_accent_color?: string | null;
};

const A4 = { w: 595.28, h: 841.89 } as const;
const MARGIN = 48;
const FONT_SMALL = 9;
const FONT_TINY = 8;

function hexToRgb01(hex: string | null | undefined): [number, number, number] | null {
  const t = expandHexColor(hex);
  if (!t) return null;
  const r = parseInt(t.slice(1, 3), 16) / 255;
  const g = parseInt(t.slice(3, 5), 16) / 255;
  const b = parseInt(t.slice(5, 7), 16) / 255;
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return [r, g, b];
}

function lighten([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  const a = Math.max(0, Math.min(1, amount));
  return [r + (1 - r) * a, g + (1 - g) * a, b + (1 - b) * a];
}

function formatDateFr(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return "—";
  try {
    const d = new Date(isoOrDate.length <= 10 ? `${isoOrDate}T12:00:00` : isoOrDate);
    return d.toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" });
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

function statusLabel(status: InvoiceRecord["status"]): string {
  if (status === "paid") return "Payée";
  if (status === "sent") return "Envoyée";
  if (status === "cancelled") return "Annulée";
  return "Brouillon";
}

function wrapLines(text: string, maxLen: number): string[] {
  if (!text) return [""];
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
    const ct = r.headers.get("content-type") ?? "";
    const isPng = ct.includes("png") || u.toLowerCase().includes(".png");
    const image = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
    const maxW = 110;
    const maxH = 56;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    return { image, w: image.width * scale, h: image.height * scale };
  } catch {
    return null;
  }
}

export async function buildInvoicePdfBuffer(args: {
  invoice: InvoiceRecord;
  items: InvoiceItem[];
  business: BusinessPdfRow;
  settings: InvoiceSettings | null;
}): Promise<Uint8Array> {
  const { invoice, items, business, settings } = args;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const primaryHex = resolvePrimaryColor(invoice, settings);
  const primary = hexToRgb01(primaryHex) ?? [0.04, 0.04, 0.04];
  const primaryPdf = rgb(primary[0], primary[1], primary[2]);
  const primaryFaint = lighten(primary, 0.92);
  const primaryFaintPdf = rgb(primaryFaint[0], primaryFaint[1], primaryFaint[2]);

  const ink = rgb(0.08, 0.08, 0.08);
  const muted = rgb(0.42, 0.42, 0.42);
  const rule = rgb(0.86, 0.86, 0.86);
  const ruleSoft = rgb(0.93, 0.93, 0.93);

  const left = MARGIN;
  const right = A4.w - MARGIN;
  let y = A4.h - MARGIN;

  const businessName =
    settings?.companyName?.trim() ||
    invoice.businessName?.trim() ||
    business.business_name?.trim() ||
    "Entreprise";

  const businessAddress =
    settings?.companyAddress?.trim() ||
    invoice.businessAddress?.trim() ||
    [
      business.address?.trim(),
      [business.postal_code?.trim(), business.city?.trim()].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join("\n");

  const businessEmail =
    settings?.companyEmail?.trim() || invoice.businessEmail?.trim() || business.email?.trim() || "";
  const businessPhone =
    settings?.companyPhone?.trim() || invoice.businessPhone?.trim() || business.phone?.trim() || "";

  const logoUrl = invoice.businessLogoUrl?.trim() || business.public_logo_url || null;
  const logo = await embedPublicLogo(pdf, logoUrl);

  if (logo) {
    page.drawImage(logo.image, { x: left, y: y - logo.h, width: logo.w, height: logo.h });
  }

  page.drawText("FACTURE", {
    x: right - fontBold.widthOfTextAtSize("FACTURE", 22),
    y: y - 8,
    size: 22,
    font: fontBold,
    color: primaryPdf,
  });
  page.drawText(invoice.invoiceNumber || "—", {
    x: right - font.widthOfTextAtSize(invoice.invoiceNumber || "—", 11),
    y: y - 26,
    size: 11,
    font,
    color: muted,
  });

  y -= Math.max(logo ? logo.h : 0, 38) + 18;

  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1.2,
    color: primaryPdf,
  });
  y -= 18;

  const colW = (right - left) / 2;

  drawBlock(
    page,
    {
      title: "Émetteur",
      lines: [
        { text: businessName, font: fontBold, size: 11, color: ink },
        ...(businessAddress ? businessAddress.split("\n").map((t) => ({ text: t, font, size: FONT_SMALL, color: muted })) : []),
        ...(businessEmail ? [{ text: businessEmail, font, size: FONT_SMALL, color: muted }] : []),
        ...(businessPhone ? [{ text: businessPhone, font, size: FONT_SMALL, color: muted }] : []),
        ...(settings?.companyVatIde?.trim()
          ? [{ text: `IDE/TVA : ${settings.companyVatIde.trim()}`, font, size: FONT_TINY, color: muted }]
          : []),
      ],
    },
    { x: left, y, w: colW - 12 },
    fontBold,
    primaryPdf
  );

  drawBlock(
    page,
    {
      title: "Facturé à",
      lines: [
        { text: invoice.customerName || "Client", font: fontBold, size: 11, color: ink },
        ...(invoice.customerAddress
          ? invoice.customerAddress.split("\n").map((t) => ({ text: t, font, size: FONT_SMALL, color: muted }))
          : []),
        ...(invoice.customerEmail
          ? [{ text: invoice.customerEmail, font, size: FONT_SMALL, color: muted }]
          : []),
        ...(invoice.customerPhone
          ? [{ text: invoice.customerPhone, font, size: FONT_SMALL, color: muted }]
          : []),
      ],
    },
    { x: left + colW + 12, y, w: colW - 12 },
    fontBold,
    primaryPdf
  );

  y -= measuredBlockHeight(invoice, settings, businessAddress) + 18;

  const metaY = y;
  drawMetaPair(page, font, fontBold, ink, muted, left, metaY, "Date d'émission", formatDateFr(invoice.issueDate));
  drawMetaPair(
    page,
    font,
    fontBold,
    ink,
    muted,
    left + 170,
    metaY,
    "Échéance",
    formatDateFr(invoice.dueDate)
  );
  drawMetaPair(
    page,
    font,
    fontBold,
    ink,
    muted,
    left + 340,
    metaY,
    "Statut",
    statusLabel(invoice.status)
  );
  y -= 38;

  const tableTop = y;
  page.drawRectangle({
    x: left,
    y: tableTop - 22,
    width: right - left,
    height: 22,
    color: primaryFaintPdf,
  });
  page.drawText("Description", { x: left + 10, y: tableTop - 16, size: FONT_TINY, font: fontBold, color: ink });
  page.drawText("Qté", {
    x: left + 320,
    y: tableTop - 16,
    size: FONT_TINY,
    font: fontBold,
    color: ink,
  });
  page.drawText("Prix unitaire", {
    x: left + 360,
    y: tableTop - 16,
    size: FONT_TINY,
    font: fontBold,
    color: ink,
  });
  const totalHdr = "Total";
  page.drawText(totalHdr, {
    x: right - 10 - fontBold.widthOfTextAtSize(totalHdr, FONT_TINY),
    y: tableTop - 16,
    size: FONT_TINY,
    font: fontBold,
    color: ink,
  });
  y = tableTop - 22;

  const cur = normalizeBusinessCurrency(invoice.currency);
  const safeItems = items.length > 0 ? items : [
    {
      id: "fallback",
      position: 0,
      description: invoice.customerName || "Prestation",
      quantity: 1,
      unitPrice: invoice.subtotal || invoice.totalAmount || 0,
      total: invoice.totalAmount || invoice.subtotal || 0,
    },
  ];

  for (const it of safeItems) {
    const descLines = wrapLines(it.description || "—", 55);
    const rowH = Math.max(20, descLines.length * 12 + 6);
    if (y - rowH < 220) break; // protège la zone de bas (totaux + footer)

    descLines.forEach((line, i) => {
      page.drawText(line, {
        x: left + 10,
        y: y - 12 - i * 12,
        size: FONT_SMALL,
        font,
        color: ink,
      });
    });
    page.drawText(formatNumber(it.quantity), {
      x: left + 320,
      y: y - 12,
      size: FONT_SMALL,
      font,
      color: ink,
    });
    page.drawText(formatPrice(it.unitPrice ?? 0, cur), {
      x: left + 360,
      y: y - 12,
      size: FONT_SMALL,
      font,
      color: ink,
    });
    const totalText = formatPrice(it.total ?? 0, cur);
    page.drawText(totalText, {
      x: right - 10 - fontBold.widthOfTextAtSize(totalText, FONT_SMALL),
      y: y - 12,
      size: FONT_SMALL,
      font: fontBold,
      color: ink,
    });
    y -= rowH;
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 0.5,
      color: ruleSoft,
    });
  }

  y -= 16;

  const subtotal = invoice.subtotal ?? safeItems.reduce((acc, it) => acc + (it.total ?? 0), 0);
  const discount = Math.max(0, invoice.discountAmount ?? 0);
  const total = Math.max(0, subtotal - discount);

  const totalsX = right - 200;
  drawTotalsRow(page, font, ink, muted, totalsX, y, "Sous-total", formatPrice(subtotal, cur));
  y -= 16;
  if (discount > 0) {
    drawTotalsRow(page, font, ink, muted, totalsX, y, "Rabais", `- ${formatPrice(discount, cur)}`);
    y -= 16;
  }
  page.drawLine({
    start: { x: totalsX, y: y - 2 },
    end: { x: right, y: y - 2 },
    thickness: 1,
    color: rule,
  });
  y -= 18;
  page.drawText("Total à payer", { x: totalsX, y, size: 11, font: fontBold, color: ink });
  const totalText = formatPrice(total, cur);
  page.drawText(totalText, {
    x: right - fontBold.widthOfTextAtSize(totalText, 13),
    y: y - 1,
    size: 13,
    font: fontBold,
    color: primaryPdf,
  });
  y -= 28;

  const paymentTerms = (invoice.paymentTerms?.trim() || settings?.paymentTerms || "").trim();
  if (paymentTerms) {
    page.drawText("Conditions de paiement", { x: left, y, size: FONT_SMALL, font: fontBold, color: ink });
    y -= 12;
    for (const ln of wrapLines(paymentTerms, 95)) {
      page.drawText(ln, { x: left, y, size: FONT_TINY, font, color: muted });
      y -= 10;
    }
    y -= 6;
  }

  if (invoice.notes?.trim()) {
    page.drawText("Notes", { x: left, y, size: FONT_SMALL, font: fontBold, color: ink });
    y -= 12;
    for (const ln of wrapLines(invoice.notes.trim(), 95)) {
      page.drawText(ln, { x: left, y, size: FONT_TINY, font, color: muted });
      y -= 10;
    }
    y -= 6;
  }

  if (invoice.reservationStartAt) {
    const tStr = formatTimeFr(invoice.reservationStartAt);
    const linkLine = `Lié au rendez-vous du ${formatDateFr(invoice.reservationStartAt)}${
      tStr ? ` à ${tStr}` : ""
    }`;
    page.drawText(linkLine, { x: left, y, size: FONT_TINY, font, color: muted });
    y -= 12;
  }

  if (settings?.legalFooter?.trim()) {
    y -= 4;
    for (const ln of wrapLines(settings.legalFooter.trim(), 110)) {
      page.drawText(ln, { x: left, y, size: 7, font, color: rgb(0.55, 0.55, 0.55) });
      y -= 9;
    }
  }

  page.drawLine({
    start: { x: left, y: 60 },
    end: { x: right, y: 60 },
    thickness: 0.5,
    color: ruleSoft,
  });
  page.drawText("Merci pour votre confiance.", {
    x: left,
    y: 46,
    size: 9,
    font: fontBold,
    color: primaryPdf,
  });
  const generated = "Document généré par Waevon";
  page.drawText(generated, {
    x: right - font.widthOfTextAtSize(generated, 7),
    y: 46,
    size: 7,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdf.save();
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function drawBlock(
  page: PDFPage,
  block: {
    title: string;
    lines: { text: string; font: import("pdf-lib").PDFFont; size: number; color: ReturnType<typeof rgb> }[];
  },
  rect: { x: number; y: number; w: number },
  fontBold: import("pdf-lib").PDFFont,
  accent: ReturnType<typeof rgb>
) {
  page.drawText(block.title.toUpperCase(), {
    x: rect.x,
    y: rect.y,
    size: 8,
    font: fontBold,
    color: accent,
  });
  let yy = rect.y - 14;
  for (const line of block.lines) {
    if (!line.text) continue;
    page.drawText(line.text, { x: rect.x, y: yy, size: line.size, font: line.font, color: line.color });
    yy -= line.size + 3;
  }
}

function measuredBlockHeight(
  invoice: InvoiceRecord,
  settings: InvoiceSettings | null,
  businessAddress: string
): number {
  const senderLines =
    1 +
    (businessAddress ? businessAddress.split("\n").length : 0) +
    (settings?.companyEmail?.trim() || invoice.businessEmail?.trim() ? 1 : 0) +
    (settings?.companyPhone?.trim() || invoice.businessPhone?.trim() ? 1 : 0) +
    (settings?.companyVatIde?.trim() ? 1 : 0);
  const billLines =
    1 +
    (invoice.customerAddress ? invoice.customerAddress.split("\n").length : 0) +
    (invoice.customerEmail ? 1 : 0) +
    (invoice.customerPhone ? 1 : 0);
  const lineCount = Math.max(senderLines, billLines);
  return 14 + lineCount * 12;
}

function drawMetaPair(
  page: PDFPage,
  font: import("pdf-lib").PDFFont,
  fontBold: import("pdf-lib").PDFFont,
  ink: ReturnType<typeof rgb>,
  muted: ReturnType<typeof rgb>,
  x: number,
  y: number,
  label: string,
  value: string
) {
  page.drawText(label.toUpperCase(), { x, y, size: 7, font: fontBold, color: muted });
  page.drawText(value, { x, y: y - 14, size: 10, font, color: ink });
}

function drawTotalsRow(
  page: PDFPage,
  font: import("pdf-lib").PDFFont,
  ink: ReturnType<typeof rgb>,
  muted: ReturnType<typeof rgb>,
  x: number,
  y: number,
  label: string,
  value: string
) {
  page.drawText(label, { x, y, size: FONT_SMALL, font, color: muted });
  const w = font.widthOfTextAtSize(value, FONT_SMALL);
  page.drawText(value, { x: A4.w - MARGIN - w, y, size: FONT_SMALL, font, color: ink });
}
