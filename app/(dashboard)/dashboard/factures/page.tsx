"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import { formatPrice } from "@/lib/utils/formatPrice";
import { btnGhostClass, btnPrimaryClass, cardClass, linkClass, spinnerClass, wavonPage } from "@/lib/wavon/tokens";
import { canUseProInvoices } from "@/lib/wavon/premium-access";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  client_name: string;
  service_name: string;
  service_price: number;
  total_amount?: number | null;
  currency: string;
  reservation_start_at: string;
  issue_date?: string | null;
  created_at: string;
};

function formatDateFr(iso: string): string {
  try {
    const s = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso;
    return format(parseISO(s), "d MMM yyyy", { locale: fr });
  } catch {
    return "—";
  }
}

function statusLabel(s: InvoiceRow["status"]) {
  if (s === "draft") return "Brouillon";
  if (s === "sent") return "Envoyée";
  if (s === "paid") return "Payée";
  return "Annulée";
}

function statusClass(s: InvoiceRow["status"]) {
  if (s === "paid") return "border-emerald-200/80 bg-emerald-50 text-emerald-950";
  if (s === "sent") return "border-blue-200/80 bg-blue-50 text-blue-950";
  if (s === "cancelled") return "border-neutral-200/90 bg-neutral-50 text-neutral-600";
  return "border-amber-200/80 bg-amber-50 text-amber-950";
}

export default function FacturesPage() {
  const { ready, state } = useWavon();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [rows, setRows] = useState<InvoiceRow[]>([]);

  const currency = state.settings.currency;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", { credentials: "same-origin" });
      const body = (await res.json().catch(() => ({}))) as { invoices?: InvoiceRow[]; error?: string; code?: string };
      if (res.status === 403 && body.code === "feature_locked") {
        setLocked(true);
        setRows([]);
        return;
      }
      setLocked(false);
      if (!res.ok) throw new Error(body.error ?? "Impossible de charger les factures.");
      setRows(Array.isArray(body.invoices) ? body.invoices : []);
    } catch (e) {
      toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur chargement factures." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, refresh]);

  const invoiceEligible = useMemo(() => canUseProInvoices(state), [state]);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  if (locked || !invoiceEligible) {
    return (
      <div className={`${wavonPage} space-y-8 py-6`}>
        <PageHeader
          title="Factures"
          description="Crée et gère des factures liées à tes réservations."
          actions={
            <Link href="/dashboard/facturation#waevon-pricing" className={btnPrimaryClass}>
              Passer au plan Pro
            </Link>
          }
        />
        <div className={`${cardClass} overflow-hidden`}>
          <div className="p-6">
            <p className="text-lg font-semibold tracking-tight text-neutral-950">
              La facturation est disponible avec le plan Pro.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Passe au plan Pro pour activer la génération de factures et suivre les paiements.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/dashboard/facturation#waevon-pricing" className={btnPrimaryClass}>
                Voir les offres
              </Link>
              <Link href="/dashboard/facturation" className={btnGhostClass}>
                Aller à la facturation
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Factures"
        description="Génère et suis tes factures liées aux réservations."
        actions={
          <button type="button" className={btnGhostClass} onClick={() => void refresh()} disabled={loading}>
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        }
      />

      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-6 py-4">
          <p className="text-sm font-medium text-neutral-800">
            {rows.length} facture{rows.length > 1 ? "s" : ""}
          </p>
          <Link href="/dashboard/parametres?tab=facturation" className={`${linkClass} text-sm`}>
            Paramètres de facturation
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className={spinnerClass} aria-hidden />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-neutral-600">Aucune facture pour l’instant.</p>
            <p className="mt-2 text-xs text-neutral-500">
              Crée une facture depuis une réservation confirmée (Calendrier → détail).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[880px] w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-6 py-3">Numéro</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3">Montant</th>
                  <th className="px-6 py-3">Émission</th>
                  <th className="px-6 py-3">Statut</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/60">
                    <td className="px-6 py-4 font-medium text-neutral-950">{r.invoice_number}</td>
                    <td className="px-6 py-4 text-neutral-800">{r.client_name || "—"}</td>
                    <td className="px-6 py-4 text-neutral-700">{r.service_name || "—"}</td>
                    <td className="px-6 py-4 font-medium text-neutral-950">
                      {formatPrice(
                        (typeof r.total_amount === "number" ? r.total_amount : r.service_price) ?? 0,
                        r.currency || currency
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-600" title="Date d’émission">
                      {formatDateFr(
                        (r.issue_date && String(r.issue_date).length >= 8 ? String(r.issue_date) : r.reservation_start_at) as string
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/factures/${r.id}`} className={btnGhostClass + " px-3 py-2 text-xs"}>
                          Voir
                        </Link>
                        <a
                          href={`/api/invoices/${r.id}/pdf`}
                          className={btnGhostClass + " inline-flex items-center px-3 py-2 text-xs no-underline"}
                        >
                          PDF
                        </a>
                        <button
                          type="button"
                          className={btnGhostClass + " px-3 py-2 text-xs"}
                          disabled={r.status === "paid" || r.status === "cancelled"}
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/invoices/${r.id}/status`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "paid" }),
                              });
                              const body = (await res.json().catch(() => ({}))) as { error?: string };
                              if (!res.ok) throw new Error(body.error ?? "Mise à jour impossible.");
                              toast.push({ message: "Facture marquée comme payée." });
                              void refresh();
                            } catch (e) {
                              toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
                            }
                          }}
                        >
                          Marquer payée
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                          disabled={r.status === "cancelled"}
                          onClick={async () => {
                            if (!confirm("Annuler cette facture ?")) return;
                            try {
                              const res = await fetch(`/api/invoices/${r.id}/status`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "cancelled" }),
                              });
                              const body = (await res.json().catch(() => ({}))) as { error?: string };
                              if (!res.ok) throw new Error(body.error ?? "Annulation impossible.");
                              toast.push({ message: "Facture annulée." });
                              void refresh();
                            } catch (e) {
                              toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
                            }
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

