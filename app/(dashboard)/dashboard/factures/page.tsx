"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import { formatPrice } from "@/lib/utils/formatPrice";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  linkClass,
  spinnerClass,
  wavonPage,
} from "@/lib/wavon/tokens";
import { canUseProInvoices } from "@/lib/wavon/premium-access";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  reservation_id: string | null;
  client_name: string;
  service_name: string;
  service_price: number;
  total_amount: number | null;
  subtotal: number | null;
  discount_amount: number | null;
  currency: string;
  reservation_start_at: string | null;
  issue_date: string | null;
  due_date: string | null;
  created_at: string;
};

function formatDateFr(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
    return format(parseISO(safe), "d MMM yyyy", { locale: fr });
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
  const [busyId, setBusyId] = useState<string | null>(null);

  const currency = state.settings.currency;
  const invoiceEligible = useMemo(() => canUseProInvoices(state), [state]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", { credentials: "same-origin" });
      const body = (await res.json().catch(() => ({}))) as {
        invoices?: InvoiceRow[];
        error?: string;
        code?: string;
      };
      if (res.status === 403 && body.code === "feature_locked") {
        setLocked(true);
        setRows([]);
        return;
      }
      setLocked(false);
      if (!res.ok) throw new Error(body.error ?? "Le chargement des factures a échoué.");
      setRows(Array.isArray(body.invoices) ? body.invoices : []);
    } catch (e) {
      toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, refresh]);

  const downloadPdf = useCallback(
    async (row: InvoiceRow) => {
      setBusyId(row.id);
      try {
        const res = await fetch(`/api/invoices/${row.id}/pdf`, { credentials: "same-origin" });
        if (!res.ok) throw new Error("La génération du PDF a échoué.");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `facture-${row.invoice_number || row.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur PDF." });
      } finally {
        setBusyId(null);
      }
    },
    [toast]
  );

  const removeInvoice = useCallback(
    async (row: InvoiceRow) => {
      if (!window.confirm(`Supprimer définitivement la facture ${row.invoice_number} ?`)) return;
      setBusyId(row.id);
      try {
        const res = await fetch(`/api/invoices/${row.id}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Suppression impossible.");
        toast.push({ message: "Facture supprimée." });
        setRows((prev) => prev.filter((r) => r.id !== row.id));
      } catch (e) {
        toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
      } finally {
        setBusyId(null);
      }
    },
    [toast]
  );

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
          description="Crée et gère les factures liées à tes réservations."
          actions={
            <Link href="/dashboard/facturation#waevon-pricing" className={btnPrimaryClass}>
              Passer au plan Pro
            </Link>
          }
        />
        <div className={`${cardClass} overflow-hidden`}>
          <div className="p-6">
            <p className="text-lg font-semibold tracking-tight text-neutral-950">
              La facturation est réservée au plan Pro.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Passe au plan Pro pour activer la création de factures depuis tes rendez-vous, le suivi des paiements et la génération de PDF professionnels.
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
        description="Liste des factures de ton commerce — édite, télécharge, archive."
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
            <p className="text-sm text-neutral-700">Aucune facture pour l&apos;instant.</p>
            <p className="mt-2 text-xs text-neutral-500">
              Crée une facture depuis le calendrier en cliquant sur un rendez-vous confirmé.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-6 py-3">Numéro</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Émission</th>
                  <th className="px-6 py-3">Échéance</th>
                  <th className="px-6 py-3">Montant</th>
                  <th className="px-6 py-3">Statut</th>
                  <th className="px-6 py-3">Réservation</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => {
                  const amount =
                    typeof r.total_amount === "number" && r.total_amount > 0
                      ? r.total_amount
                      : typeof r.subtotal === "number" && r.subtotal > 0
                        ? r.subtotal
                        : (r.service_price ?? 0);
                  return (
                    <tr key={r.id} className="hover:bg-neutral-50/60">
                      <td className="px-6 py-4 font-medium text-neutral-950">{r.invoice_number || "—"}</td>
                      <td className="px-6 py-4 text-neutral-800">{r.client_name || "—"}</td>
                      <td className="px-6 py-4 text-neutral-600">{formatDateFr(r.issue_date ?? r.created_at)}</td>
                      <td className="px-6 py-4 text-neutral-600">{formatDateFr(r.due_date)}</td>
                      <td className="px-6 py-4 font-medium text-neutral-950">
                        {formatPrice(amount, r.currency || currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                            r.status
                          )}`}
                        >
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-500">
                        {r.reservation_start_at
                          ? formatDateFr(r.reservation_start_at)
                          : r.reservation_id
                            ? "Liée"
                            : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/dashboard/factures/${r.id}`}
                            className={btnGhostClass + " px-3 py-2 text-xs"}
                          >
                            Voir / Modifier
                          </Link>
                          <button
                            type="button"
                            className={btnGhostClass + " px-3 py-2 text-xs"}
                            disabled={busyId === r.id}
                            onClick={() => void downloadPdf(r)}
                          >
                            {busyId === r.id ? "…" : "PDF"}
                          </button>
                          <button
                            type="button"
                            className="rounded-full px-3 py-2 text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                            disabled={busyId === r.id}
                            onClick={() => void removeInvoice(r)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
