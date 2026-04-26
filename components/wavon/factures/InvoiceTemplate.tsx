/**
 * InvoiceTemplate — composant unique utilisé pour :
 *  - le rendu PDF (server-side) via `renderToBuffer(<InvoiceTemplate ... />)`
 *  - l'aperçu visuel dans la modale (client-side) via `<PDFViewer>`
 *
 * Aucune mention "Waevon" ne doit apparaître sur la facture finale.
 */

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  expandHexColor,
  resolvePrimaryColor,
  type InvoiceItem,
  type InvoiceRecord,
  type InvoiceSettings,
} from "@/lib/invoices/invoice-model";
import { formatPrice, normalizeBusinessCurrency } from "@/lib/utils/formatPrice";

export type InvoiceTemplateBusiness = {
  business_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  public_logo_url: string | null;
  public_accent_color?: string | null;
};

export type InvoiceTemplateProps = {
  invoice: InvoiceRecord;
  items: InvoiceItem[];
  settings: InvoiceSettings | null;
  business: InvoiceTemplateBusiness | null;
};

function fadedHex(hex: string, alphaPct: number): string {
  const t = expandHexColor(hex) ?? "#0a0a0a";
  const r = parseInt(t.slice(1, 3), 16);
  const g = parseInt(t.slice(3, 5), 16);
  const b = parseInt(t.slice(5, 7), 16);
  const a = Math.max(0, Math.min(100, alphaPct)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function formatDateFr(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
    const d = new Date(safe);
    return d.toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

function statusLabel(status: InvoiceRecord["status"]): string {
  if (status === "paid") return "Payée";
  if (status === "sent") return "Envoyée";
  if (status === "cancelled") return "Annulée";
  return "Brouillon";
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function formatIban(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.replace(/\s+/g, "").toUpperCase();
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
}

const baseStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 9,
    color: "#1f2937",
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  topBar: {
    height: 6,
    width: "100%",
    marginBottom: 18,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "row",
    gap: 12,
  },
  logo: {
    width: 56,
    height: 56,
    objectFit: "contain",
  },
  logoFallback: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  businessBlock: {
    maxWidth: 230,
  },
  businessName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0a0a0a",
    marginBottom: 2,
  },
  smallMuted: {
    fontSize: 8.5,
    color: "#525252",
    lineHeight: 1.4,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 22,
    letterSpacing: 4,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  invoiceNumber: {
    marginTop: 4,
    fontSize: 10,
    color: "#404040",
  },
  badge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  blockTitle: {
    fontSize: 8,
    letterSpacing: 1.4,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  twoCols: {
    flexDirection: "row",
    gap: 24,
    marginTop: 14,
    marginBottom: 18,
  },
  col: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 6,
  },
  metaCell: {
    minWidth: 96,
  },
  metaLabel: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    fontFamily: "Helvetica-Bold",
    color: "#737373",
    textTransform: "uppercase",
  },
  metaValue: {
    marginTop: 2,
    fontSize: 9.5,
    color: "#0a0a0a",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  th: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#0a0a0a",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  thDescription: { flex: 4 },
  thQty: { width: 36, textAlign: "right" },
  thUnit: { width: 80, textAlign: "right" },
  thTotal: { width: 80, textAlign: "right" },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  cellDescription: { flex: 4, paddingRight: 8 },
  cellQty: { width: 36, textAlign: "right" },
  cellUnit: { width: 80, textAlign: "right" },
  cellTotal: { width: 80, textAlign: "right", fontFamily: "Helvetica-Bold", color: "#0a0a0a" },
  cellText: { fontSize: 9, color: "#0a0a0a", lineHeight: 1.35 },
  cellMuted: { fontSize: 9, color: "#404040" },
  totalsWrap: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  totalsBox: {
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    paddingVertical: 3,
  },
  totalsRowLabel: { color: "#525252" },
  totalsRowValue: { color: "#0a0a0a" },
  totalsDivider: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  totalsTotalLabel: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#0a0a0a",
  },
  totalsTotalValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  paySection: {
    marginTop: 22,
    padding: 12,
    borderRadius: 6,
    borderWidth: 0.7,
  },
  payRow: {
    flexDirection: "row",
    fontSize: 9,
    color: "#1f2937",
    marginTop: 2,
    lineHeight: 1.45,
  },
  payLabel: {
    width: 100,
    fontFamily: "Helvetica-Bold",
    color: "#404040",
  },
  payValue: {
    flex: 1,
    color: "#0a0a0a",
  },
  notesBlock: {
    marginTop: 14,
  },
  legalFooter: {
    marginTop: 18,
    fontSize: 7.5,
    color: "#9ca3af",
    lineHeight: 1.4,
  },
  closingRow: {
    marginTop: "auto",
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    fontSize: 8.5,
    color: "#525252",
  },
  closingThanks: {
    fontFamily: "Helvetica-Bold",
  },
});

function lines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export function InvoiceTemplate({ invoice, items, settings, business }: InvoiceTemplateProps) {
  const primaryHex = resolvePrimaryColor(invoice, settings);
  const primaryFaint = fadedHex(primaryHex, 8);
  const primaryBorder = fadedHex(primaryHex, 30);
  const currency = normalizeBusinessCurrency(invoice.currency);

  const businessName =
    settings?.companyName?.trim() ||
    invoice.businessName?.trim() ||
    business?.business_name?.trim() ||
    "Entreprise";

  const businessAddress =
    settings?.companyAddress?.trim() ||
    invoice.businessAddress?.trim() ||
    [
      business?.address?.trim(),
      [business?.postal_code?.trim(), business?.city?.trim()].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join("\n");

  const businessEmail =
    settings?.companyEmail?.trim() ||
    invoice.businessEmail?.trim() ||
    business?.email?.trim() ||
    "";
  const businessPhone =
    settings?.companyPhone?.trim() ||
    invoice.businessPhone?.trim() ||
    business?.phone?.trim() ||
    "";
  const logoUrl = invoice.businessLogoUrl?.trim() || business?.public_logo_url || null;

  const subtotal = items.reduce((acc, it) => acc + (it.total ?? 0), 0);
  const discount = Math.max(0, invoice.discountAmount ?? 0);
  const total = Math.max(0, subtotal - discount);

  const paymentTerms = invoice.paymentTerms?.trim() || settings?.paymentTerms?.trim() || "";
  const paymentIban = formatIban(invoice.paymentIban ?? settings?.paymentIban ?? "");
  const paymentHolder =
    invoice.paymentAccountHolder?.trim() ||
    settings?.paymentAccountHolder?.trim() ||
    businessName;
  const paymentBank =
    invoice.paymentBankName?.trim() || settings?.paymentBankName?.trim() || "";

  const showPaymentBlock =
    Boolean(paymentIban) || Boolean(paymentHolder) || Boolean(paymentBank) || Boolean(paymentTerms);

  const status = statusLabel(invoice.status);

  return (
    <Document
      title={`Facture ${invoice.invoiceNumber || invoice.id}`}
      author={businessName}
      creator={businessName}
      producer={businessName}
    >
      <Page size="A4" style={baseStyles.page}>
        <View style={[baseStyles.topBar, { backgroundColor: primaryHex }]} />

        <View style={baseStyles.headerRow}>
          <View style={baseStyles.headerLeft}>
            {logoUrl ? (
              // `Image` est un composant @react-pdf (pas un <img> DOM) — pas de prop alt.
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoUrl} style={baseStyles.logo} />
            ) : (
              <View style={[baseStyles.logoFallback, { backgroundColor: primaryHex }]}>
                <Text style={baseStyles.logoFallbackText}>
                  {businessName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={baseStyles.businessBlock}>
              <Text style={baseStyles.businessName}>{businessName}</Text>
              {lines(businessAddress).map((line, idx) => (
                <Text key={`addr-${idx}`} style={baseStyles.smallMuted}>
                  {line}
                </Text>
              ))}
              {businessEmail ? <Text style={baseStyles.smallMuted}>{businessEmail}</Text> : null}
              {businessPhone ? <Text style={baseStyles.smallMuted}>{businessPhone}</Text> : null}
              {settings?.companyVatIde?.trim() ? (
                <Text style={baseStyles.smallMuted}>IDE/TVA : {settings.companyVatIde.trim()}</Text>
              ) : null}
            </View>
          </View>

          <View style={baseStyles.headerRight}>
            <Text style={[baseStyles.invoiceTitle, { color: primaryHex }]}>Facture</Text>
            <Text style={baseStyles.invoiceNumber}>{invoice.invoiceNumber || "—"}</Text>
            <Text
              style={[
                baseStyles.badge,
                {
                  borderColor: primaryBorder,
                  color: primaryHex,
                  backgroundColor: primaryFaint,
                },
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        <View style={baseStyles.twoCols}>
          <View style={baseStyles.col}>
            <Text style={[baseStyles.blockTitle, { color: primaryHex }]}>Facturé à</Text>
            <Text style={[baseStyles.businessName, { marginTop: 4 }]}>
              {invoice.customerName || "Client"}
            </Text>
            {lines(invoice.customerAddress).map((line, idx) => (
              <Text key={`cust-${idx}`} style={baseStyles.smallMuted}>
                {line}
              </Text>
            ))}
            {invoice.customerEmail ? (
              <Text style={baseStyles.smallMuted}>{invoice.customerEmail}</Text>
            ) : null}
            {invoice.customerPhone ? (
              <Text style={baseStyles.smallMuted}>{invoice.customerPhone}</Text>
            ) : null}
          </View>
          <View style={baseStyles.col}>
            <Text style={[baseStyles.blockTitle, { color: primaryHex }]}>Détails</Text>
            <View style={baseStyles.metaRow}>
              <View style={baseStyles.metaCell}>
                <Text style={baseStyles.metaLabel}>Émission</Text>
                <Text style={baseStyles.metaValue}>{formatDateFr(invoice.issueDate)}</Text>
              </View>
              <View style={baseStyles.metaCell}>
                <Text style={baseStyles.metaLabel}>Échéance</Text>
                <Text style={baseStyles.metaValue}>{formatDateFr(invoice.dueDate)}</Text>
              </View>
            </View>
            {invoice.reservationStartAt ? (
              <View style={baseStyles.metaRow}>
                <View style={baseStyles.metaCell}>
                  <Text style={baseStyles.metaLabel}>Rendez-vous</Text>
                  <Text style={baseStyles.metaValue}>
                    {formatDateFr(invoice.reservationStartAt)}
                  </Text>
                </View>
                <View style={baseStyles.metaCell}>
                  <Text style={baseStyles.metaLabel}>Devise</Text>
                  <Text style={baseStyles.metaValue}>{currency}</Text>
                </View>
              </View>
            ) : (
              <View style={baseStyles.metaRow}>
                <View style={baseStyles.metaCell}>
                  <Text style={baseStyles.metaLabel}>Devise</Text>
                  <Text style={baseStyles.metaValue}>{currency}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={[baseStyles.tableHeader, { backgroundColor: primaryFaint }]}>
          <Text style={[baseStyles.th, baseStyles.thDescription]}>Description</Text>
          <Text style={[baseStyles.th, baseStyles.thQty]}>Qté</Text>
          <Text style={[baseStyles.th, baseStyles.thUnit]}>Prix unit.</Text>
          <Text style={[baseStyles.th, baseStyles.thTotal]}>Total</Text>
        </View>

        {(items.length === 0
          ? [
              {
                id: "empty",
                position: 0,
                description: "Aucune ligne",
                quantity: 0,
                unitPrice: 0,
                total: 0,
              } as InvoiceItem,
            ]
          : items
        ).map((it) => (
          <View key={it.id} style={baseStyles.row} wrap={false}>
            <View style={baseStyles.cellDescription}>
              <Text style={baseStyles.cellText}>{it.description || "—"}</Text>
            </View>
            <Text style={[baseStyles.cellQty, baseStyles.cellMuted]}>{formatQty(it.quantity)}</Text>
            <Text style={[baseStyles.cellUnit, baseStyles.cellMuted]}>
              {formatPrice(it.unitPrice ?? 0, currency)}
            </Text>
            <Text style={baseStyles.cellTotal}>{formatPrice(it.total ?? 0, currency)}</Text>
          </View>
        ))}

        <View style={baseStyles.totalsWrap}>
          <View style={baseStyles.totalsBox}>
            <View style={baseStyles.totalsRow}>
              <Text style={baseStyles.totalsRowLabel}>Sous-total</Text>
              <Text style={baseStyles.totalsRowValue}>{formatPrice(subtotal, currency)}</Text>
            </View>
            {discount > 0 ? (
              <View style={baseStyles.totalsRow}>
                <Text style={baseStyles.totalsRowLabel}>Rabais</Text>
                <Text style={baseStyles.totalsRowValue}>- {formatPrice(discount, currency)}</Text>
              </View>
            ) : null}
            <View style={[baseStyles.totalsDivider, { borderTopColor: primaryBorder }]}>
              <Text style={baseStyles.totalsTotalLabel}>Total à payer</Text>
              <Text style={[baseStyles.totalsTotalValue, { color: primaryHex }]}>
                {formatPrice(total, currency)}
              </Text>
            </View>
          </View>
        </View>

        {showPaymentBlock ? (
          <View
            style={[
              baseStyles.paySection,
              { backgroundColor: primaryFaint, borderColor: primaryBorder },
            ]}
            wrap={false}
          >
            <Text style={[baseStyles.blockTitle, { color: primaryHex, marginBottom: 6 }]}>
              Informations de paiement
            </Text>
            {paymentIban ? (
              <View style={baseStyles.payRow}>
                <Text style={baseStyles.payLabel}>IBAN</Text>
                <Text style={baseStyles.payValue}>{paymentIban}</Text>
              </View>
            ) : null}
            {paymentHolder ? (
              <View style={baseStyles.payRow}>
                <Text style={baseStyles.payLabel}>Titulaire</Text>
                <Text style={baseStyles.payValue}>{paymentHolder}</Text>
              </View>
            ) : null}
            {paymentBank ? (
              <View style={baseStyles.payRow}>
                <Text style={baseStyles.payLabel}>Banque</Text>
                <Text style={baseStyles.payValue}>{paymentBank}</Text>
              </View>
            ) : null}
            {paymentTerms ? (
              <View style={baseStyles.payRow}>
                <Text style={baseStyles.payLabel}>Conditions</Text>
                <Text style={baseStyles.payValue}>{paymentTerms}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {invoice.notes?.trim() ? (
          <View style={baseStyles.notesBlock} wrap={false}>
            <Text style={[baseStyles.blockTitle, { color: primaryHex }]}>Notes</Text>
            <Text style={[baseStyles.smallMuted, { marginTop: 4 }]}>{invoice.notes.trim()}</Text>
          </View>
        ) : null}

        {settings?.legalFooter?.trim() ? (
          <Text style={baseStyles.legalFooter}>{settings.legalFooter.trim()}</Text>
        ) : null}

        <View style={baseStyles.closingRow}>
          <Text style={[baseStyles.closingThanks, { color: primaryHex }]}>
            Merci pour votre confiance.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
