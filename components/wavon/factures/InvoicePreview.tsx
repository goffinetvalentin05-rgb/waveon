"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  resolvePrimaryColor,
  type InvoiceItem,
  type InvoiceRecord,
  type InvoiceSettings,
} from "@/lib/invoices/invoice-model";
import { formatPrice } from "@/lib/utils/formatPrice";

type Props = {
  invoice: InvoiceRecord;
  items: InvoiceItem[];
  settings: InvoiceSettings | null;
  business: {
    business_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    public_logo_url: string | null;
    public_accent_color: string | null;
  } | null;
  /** Échelle visuelle (1 = 100%). */
  scale?: number;
};

function formatDateFr(value: string | null | undefined, fmt = "dd MMMM yyyy"): string {
  if (!value) return "—";
  try {
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
    return format(parseISO(safe), fmt, { locale: fr });
  } catch {
    return "—";
  }
}

function statusBadge(status: InvoiceRecord["status"]): { label: string; className: string } {
  if (status === "paid")
    return { label: "Payée", className: "border-emerald-200/80 bg-emerald-50 text-emerald-900" };
  if (status === "sent")
    return { label: "Envoyée", className: "border-blue-200/80 bg-blue-50 text-blue-900" };
  if (status === "cancelled")
    return { label: "Annulée", className: "border-neutral-200/90 bg-neutral-50 text-neutral-600" };
  return { label: "Brouillon", className: "border-amber-200/80 bg-amber-50 text-amber-900" };
}

export function InvoicePreview({ invoice, items, settings, business, scale = 1 }: Props) {
  const primary = useMemo(() => resolvePrimaryColor(invoice, settings), [invoice, settings]);

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
    settings?.companyEmail?.trim() || invoice.businessEmail?.trim() || business?.email?.trim() || "";
  const businessPhone =
    settings?.companyPhone?.trim() || invoice.businessPhone?.trim() || business?.phone?.trim() || "";
  const logoUrl = invoice.businessLogoUrl?.trim() || business?.public_logo_url || null;

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + (it.total ?? 0), 0), [items]);
  const total = Math.max(0, subtotal - Math.max(0, invoice.discountAmount ?? 0));
  const status = statusBadge(invoice.status);
  const paymentTerms = invoice.paymentTerms?.trim() || settings?.paymentTerms?.trim() || "";

  const pageStyle = useMemo(
    () => ({
      width: `${595 * scale}px`,
      minHeight: `${842 * scale}px`,
      transform: scale !== 1 ? undefined : undefined,
    }),
    [scale]
  );

  return (
    <div className="flex justify-center">
      <article
        className="relative flex flex-col overflow-hidden rounded-[20px] border border-neutral-200/80 bg-white text-neutral-900 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.18)]"
        style={pageStyle}
      >
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0 h-2"
          style={{ backgroundColor: primary }}
        />

        <div className="flex items-start justify-between gap-6 px-12 pt-12">
          <div className="flex items-start gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={businessName}
                className="max-h-16 w-auto rounded-md object-contain"
                style={{ maxWidth: 140 }}
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                {businessName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="space-y-0.5 text-[11px] leading-snug text-neutral-600">
              <p className="text-[13px] font-semibold text-neutral-950">{businessName}</p>
              {businessAddress
                ? businessAddress.split("\n").map((line, idx) => (
                    <p key={idx} className="whitespace-pre-line">
                      {line}
                    </p>
                  ))
                : null}
              {businessEmail ? <p>{businessEmail}</p> : null}
              {businessPhone ? <p>{businessPhone}</p> : null}
              {settings?.companyVatIde?.trim() ? (
                <p className="text-[10px] text-neutral-500">IDE/TVA : {settings.companyVatIde.trim()}</p>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            <p
              className="font-display text-[28px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: primary }}
            >
              Facture
            </p>
            <p className="mt-1 text-[12px] font-medium text-neutral-700">{invoice.invoiceNumber || "—"}</p>
            <span
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-medium ${status.className}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        <div className="px-12 pt-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: primary }}>
                Facturé à
              </p>
              <div className="mt-2 space-y-0.5 text-[12px] leading-snug text-neutral-700">
                <p className="text-[13px] font-semibold text-neutral-950">{invoice.customerName || "Client"}</p>
                {invoice.customerAddress
                  ? invoice.customerAddress.split("\n").map((line, idx) => (
                      <p key={idx} className="whitespace-pre-line">
                        {line}
                      </p>
                    ))
                  : null}
                {invoice.customerEmail ? <p>{invoice.customerEmail}</p> : null}
                {invoice.customerPhone ? <p>{invoice.customerPhone}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <MetaCell label="Émission" value={formatDateFr(invoice.issueDate)} />
              <MetaCell label="Échéance" value={formatDateFr(invoice.dueDate)} />
              {invoice.reservationStartAt ? (
                <MetaCell
                  label="Rendez-vous"
                  value={`${formatDateFr(invoice.reservationStartAt, "d MMM yyyy")} · ${formatDateFr(
                    invoice.reservationStartAt,
                    "HH:mm"
                  )}`}
                />
              ) : null}
              <MetaCell label="Devise" value={invoice.currency} />
            </div>
          </div>
        </div>

        <div className="mt-8 px-12">
          <table className="w-full text-left text-[11.5px]">
            <thead>
              <tr
                className="text-[10px] uppercase tracking-[0.14em] text-neutral-700"
                style={{ backgroundColor: `${primary}10` }}
              >
                <th className="rounded-l-md px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Qté</th>
                <th className="px-3 py-2 text-right">Prix unit.</th>
                <th className="rounded-r-md px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(items.length === 0
                ? [
                    {
                      id: "placeholder",
                      position: 0,
                      description: "Aucune ligne",
                      quantity: 0,
                      unitPrice: 0,
                      total: 0,
                    } as InvoiceItem,
                  ]
                : items
              ).map((it) => (
                <tr key={it.id} className="border-b border-neutral-100 align-top">
                  <td className="px-3 py-3">
                    <p className="whitespace-pre-line text-neutral-900">{it.description || "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-neutral-700">
                    {Number.isFinite(it.quantity)
                      ? it.quantity % 1 === 0
                        ? it.quantity
                        : it.quantity.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-neutral-700">
                    {formatPrice(it.unitPrice ?? 0, invoice.currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-neutral-950">
                    {formatPrice(it.total ?? 0, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 px-12">
          <div className="ml-auto w-full max-w-xs space-y-1.5 text-[11.5px]">
            <Row label="Sous-total" value={formatPrice(subtotal, invoice.currency)} />
            {invoice.discountAmount > 0 ? (
              <Row label="Rabais" value={`- ${formatPrice(invoice.discountAmount, invoice.currency)}`} />
            ) : null}
            <div
              className="mt-2 flex items-baseline justify-between border-t pt-2"
              style={{ borderColor: `${primary}30` }}
            >
              <span className="text-[12px] font-medium text-neutral-800">Total à payer</span>
              <span className="text-[16px] font-semibold tabular-nums" style={{ color: primary }}>
                {formatPrice(total, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {paymentTerms || invoice.notes?.trim() ? (
          <div className="mt-8 grid grid-cols-2 gap-6 px-12">
            {paymentTerms ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: primary }}>
                  Conditions de paiement
                </p>
                <p className="mt-1 whitespace-pre-line text-[11px] leading-snug text-neutral-600">
                  {paymentTerms}
                </p>
              </div>
            ) : null}
            {invoice.notes?.trim() ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: primary }}>
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-line text-[11px] leading-snug text-neutral-600">
                  {invoice.notes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto px-12 pb-10 pt-12">
          <div className="border-t border-neutral-100 pt-3 text-[10px] text-neutral-500">
            <div className="flex items-baseline justify-between">
              <span className="font-medium" style={{ color: primary }}>
                Merci pour votre confiance.
              </span>
              <span>Document généré par Waevon</span>
            </div>
            {settings?.legalFooter?.trim() ? (
              <p className="mt-2 whitespace-pre-line text-[9px] text-neutral-400">{settings.legalFooter}</p>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-neutral-600">{label}</span>
      <span className="tabular-nums text-neutral-800">{value}</span>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-0.5 text-neutral-900">{value}</p>
    </div>
  );
}
