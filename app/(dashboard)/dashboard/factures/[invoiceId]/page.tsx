"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/components/wavon/Toast";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { formatPrice } from "@/lib/utils/formatPrice";
import { btnGhostClass, btnPrimaryClass, cardClass, linkClass, spinnerClass } from "@/lib/wavon/tokens";
import { canUseProInvoices } from "@/lib/wavon/premium-access";

type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

type InvoiceDetail = {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  reservation_start_at: string;
  service_name: string;
  service_price: number;
  currency: string;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
};

type InvoiceSettings = {
  auto_create_on_confirmed: boolean;
  company_name: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_vat_ide: string | null;
  payment_terms: string;
  brand_color: string | null;
  legal_footer: string | null;
  updated_at: string;
};

function formatDateFr(iso: string | null | undefined, fmt = "d MMMM yyyy"): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), fmt, { locale: fr });
  } catch {
    return "—";
  }
}

function statusLabel(s: InvoiceStatus) {
  if (s === "draft") return "Brouillon";
  if (s === "sent") return "Envoyée";
  if (s === "paid") return "Payée";
  return "Annulée";
}

function statusClass(s: InvoiceStatus) {
  if (s === "paid") return "border-emerald-200/80 bg-emerald-50 text-emerald-950";
  if (s === "sent") return "border-blue-200/80 bg-blue-50 text-blue-950";
  if (s === "cancelled") return "border-neutral-200/90 bg-neutral-50 text-neutral-600";
  return "border-amber-200/80 bg-amber-50 text-amber-950";
}

export default function FactureDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { ready, state } = useWavon();

  const invoiceId = (params?.invoiceId ?? "").trim();
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);

  const invoiceEligible = useMemo(() => canUseProInvoices(state), [state]);

  useEffect(() => {
    if (!ready) return;
    if (!invoiceId) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`, { credentials: "same-origin" });
        const body = (await res.json().catch(() => ({}))) as {
          invoice?: InvoiceDetail;
          invoiceSettings?: InvoiceSettings | null;
          error?: string;
          code?: string;
        };
        if (res.status === 403 && body.code === "feature_locked") {
          setLocked(true);
          setInvoice(null);
          setSettings(null);
          return;
        }
        setLocked(false);
        if (!res.ok) throw new Error(body.error ?? "Impossible de charger la facture.");
        setInvoice(body.invoice ?? null);
        setSettings(body.invoiceSettings ?? null);
      } catch (e) {
        toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur chargement." });
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, invoiceId, toast]);

  const updateStatus = async (status: InvoiceStatus) => {
    if (!invoice) return;
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Mise à jour impossible.");
      toast.push({ message: "Statut mis à jour." });
      router.refresh();
      // Simple re-fetch
      const refreshed = await fetch(`/api/invoices/${invoice.id}`, { credentials: "same-origin" });
      const next = (await refreshed.json().catch(() => ({}))) as { invoice?: InvoiceDetail; invoiceSettings?: InvoiceSettings | null };
      if (next.invoice) setInvoice(next.invoice);
      if (next.invoiceSettings !== undefined) setSettings(next.invoiceSettings ?? null);
    } catch (e) {
      toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
    }
  };

  if (!ready || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  if (locked || !invoiceEligible) {
    return (
      <div className="space-y-8 pb-8">
        <PageHeader
          title="Factures"
          description="La facturation est disponible avec le plan Pro."
          actions={
            <Link href="/dashboard/facturation#waevon-pricing" className={btnPrimaryClass}>
              Passer au plan Pro
            </Link>
          }
        />
        <div className={cardClass}>
          <p className="text-sm text-neutral-600">
            Cette page est verrouillée.{" "}
            <Link href="/dashboard/facturation#waevon-pricing" className={`${linkClass} font-medium`}>
              Voir les offres
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-8 pb-8">
        <PageHeader title="Facture introuvable" description="Cette facture n’existe pas ou n’est plus accessible." />
        <Link href="/dashboard/factures" className={btnGhostClass}>
          Retour aux factures
        </Link>
      </div>
    );
  }

  const companyName = settings?.company_name?.trim() || state.settings.businessName || "Entreprise";
  const companyAddress = settings?.company_address?.trim() || state.settings.address || "";
  const companyEmail = settings?.company_email?.trim() || state.settings.email || "";
  const paymentTerms = settings?.payment_terms?.trim() || "Paiement à 30 jours";

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title={`Facture ${invoice.invoice_number}`}
        description={`Créée le ${formatDateFr(invoice.created_at, "d MMM yyyy")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              className={btnPrimaryClass + " no-underline inline-flex items-center justify-center"}
            >
              Télécharger le PDF
            </a>
            <Link href="/dashboard/factures" className={btnGhostClass}>
              Retour
            </Link>
            {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
              <button type="button" className={btnGhostClass} onClick={() => void updateStatus("paid")}>
                Marquer payée
              </button>
            ) : null}
            {invoice.status !== "cancelled" ? (
              <button
                type="button"
                className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (!confirm("Annuler cette facture ?")) return;
                  void updateStatus("cancelled");
                }}
              >
                Annuler
              </button>
            ) : null}
          </div>
        }
      />

      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex flex-col gap-4 border-b border-neutral-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Statut</p>
            <div className="mt-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(invoice.status)}`}>
                {statusLabel(invoice.status)}
              </span>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Réservation : {formatDateFr(invoice.reservation_start_at, "d MMM yyyy")} ·{" "}
              {formatDateFr(invoice.reservation_start_at, "HH:mm")}
            </p>
          </div>
          <div className="text-sm text-neutral-700">
            <p className="font-semibold text-neutral-950">{companyName}</p>
            {companyAddress ? <p className="mt-1 whitespace-pre-line text-neutral-600">{companyAddress}</p> : null}
            {companyEmail ? <p className="mt-2 text-neutral-600">{companyEmail}</p> : null}
            {settings?.company_vat_ide?.trim() ? (
              <p className="mt-1 text-xs text-neutral-500">IDE/TVA : {settings.company_vat_ide.trim()}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">
          <section>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Facturé à</p>
            <div className="mt-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4">
              <p className="font-medium text-neutral-950">{invoice.client_name || "Client"}</p>
              <div className="mt-2 space-y-1 text-sm text-neutral-600">
                <p>{invoice.client_email || "—"}</p>
                <p>{invoice.client_phone || "—"}</p>
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Conditions</p>
            <div className="mt-2 rounded-2xl border border-neutral-200/80 bg-white p-4 text-sm text-neutral-700">
              <p>
                <span className="font-medium text-neutral-950">Conditions de paiement :</span> {paymentTerms}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                Envoi/Paiement/Annulation :{" "}
                {formatDateFr(invoice.sent_at, "d MMM yyyy")}/{formatDateFr(invoice.paid_at, "d MMM yyyy")}/
                {formatDateFr(invoice.cancelled_at, "d MMM yyyy")}
              </p>
            </div>
          </section>
        </div>

        <div className="border-t border-neutral-100 px-6 py-6">
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-4 py-4">
                    <p className="font-medium text-neutral-950">{invoice.service_name || "Service"}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Rendez-vous du {formatDateFr(invoice.reservation_start_at, "d MMM yyyy")} à{" "}
                      {formatDateFr(invoice.reservation_start_at, "HH:mm")}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-neutral-950">
                    {formatPrice(invoice.service_price ?? 0, invoice.currency)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-4 text-right text-sm font-semibold text-neutral-700">Total</td>
                  <td className="px-4 py-4 text-right text-base font-semibold text-neutral-950">
                    {formatPrice(invoice.service_price ?? 0, invoice.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

