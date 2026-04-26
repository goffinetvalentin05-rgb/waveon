"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/wavon/Toast";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import {
  expandHexColor,
  recomputeTotals,
  resolvePrimaryColor,
  type InvoiceItem,
  type InvoiceRecord,
  type InvoiceSettings,
  type InvoiceStatus,
} from "@/lib/invoices/invoice-model";
import { canUseProInvoices } from "@/lib/wavon/premium-access";
import { currencyFieldAffix } from "@/lib/utils/formatPrice";
import {
  btnGhostClass,
  btnPrimaryClass,
  btnSecondaryClass,
  cardClass,
  inputClass,
  labelClass,
  linkClass,
  spinnerClass,
  textareaClass,
  userTextBreakClass,
} from "@/lib/wavon/tokens";
import type { InvoiceTemplateBusiness } from "@/components/wavon/factures/InvoiceTemplate";

const InvoicePreviewModal = dynamic(
  () =>
    import("@/components/wavon/factures/InvoicePreviewModal").then((m) => m.InvoicePreviewModal),
  { ssr: false }
);

type DraftItem = {
  key: string;
  serverId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
};

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyée" },
  { value: "paid", label: "Payée" },
  { value: "cancelled", label: "Annulée" },
];

function newLocalKey(): string {
  return `local-${Math.random().toString(36).slice(2, 10)}`;
}

function itemToDraft(item: InvoiceItem): DraftItem {
  return {
    key: item.id,
    serverId: item.id,
    description: item.description ?? "",
    quantity:
      Number.isFinite(item.quantity) && item.quantity % 1 !== 0
        ? String(item.quantity)
        : String(Math.round(item.quantity ?? 1)),
    unitPrice: String(Math.max(0, Math.round(item.unitPrice ?? 0))),
  };
}

function parseQuantity(value: string): number {
  const n = Number(String(value).replace(/,/g, "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function parseUnit(value: string): number {
  const n = Number(String(value).replace(/,/g, "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export default function FactureDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { ready, state } = useWavon();

  const invoiceId = (params?.invoiceId ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [serverInvoice, setServerInvoice] = useState<InvoiceRecord | null>(null);
  const [serverItems, setServerItems] = useState<InvoiceItem[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [business, setBusiness] = useState<InvoiceTemplateBusiness | null>(null);

  const [draftStatus, setDraftStatus] = useState<InvoiceStatus>("draft");
  const [draftCustomerName, setDraftCustomerName] = useState("");
  const [draftCustomerEmail, setDraftCustomerEmail] = useState("");
  const [draftCustomerPhone, setDraftCustomerPhone] = useState("");
  const [draftCustomerAddress, setDraftCustomerAddress] = useState("");
  const [draftIssueDate, setDraftIssueDate] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [draftDiscount, setDraftDiscount] = useState("0");
  const [draftPaymentTerms, setDraftPaymentTerms] = useState("");
  const [draftPaymentIban, setDraftPaymentIban] = useState("");
  const [draftPaymentHolder, setDraftPaymentHolder] = useState("");
  const [draftPaymentBank, setDraftPaymentBank] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftPrimaryColor, setDraftPrimaryColor] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  const invoiceEligible = useMemo(() => canUseProInvoices(state), [state]);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { credentials: "same-origin" });
      const body = (await res.json().catch(() => ({}))) as {
        invoice?: InvoiceRecord;
        items?: InvoiceItem[];
        settings?: InvoiceSettings | null;
        business?: InvoiceTemplateBusiness | null;
        error?: string;
        code?: string;
      };
      if (res.status === 403 && body.code === "feature_locked") {
        setLocked(true);
        setServerInvoice(null);
        setServerItems([]);
        return;
      }
      if (res.status === 404) {
        setNotFound(true);
        setServerInvoice(null);
        setServerItems([]);
        return;
      }
      setLocked(false);
      setNotFound(false);
      if (!res.ok || !body.invoice) {
        throw new Error(body.error ?? "Le chargement de la facture a échoué.");
      }
      setServerInvoice(body.invoice);
      setServerItems(body.items ?? []);
      setSettings(body.settings ?? null);
      setBusiness(body.business ?? null);

      setDraftStatus(body.invoice.status);
      setDraftCustomerName(body.invoice.customerName ?? "");
      setDraftCustomerEmail(body.invoice.customerEmail ?? "");
      setDraftCustomerPhone(body.invoice.customerPhone ?? "");
      setDraftCustomerAddress(body.invoice.customerAddress ?? "");
      setDraftIssueDate(body.invoice.issueDate ?? "");
      setDraftDueDate(body.invoice.dueDate ?? "");
      setDraftDiscount(String(Math.max(0, body.invoice.discountAmount ?? 0)));
      setDraftPaymentTerms(body.invoice.paymentTerms ?? body.settings?.paymentTerms ?? "");
      setDraftPaymentIban(body.invoice.paymentIban ?? body.settings?.paymentIban ?? "");
      setDraftPaymentHolder(
        body.invoice.paymentAccountHolder ?? body.settings?.paymentAccountHolder ?? ""
      );
      setDraftPaymentBank(body.invoice.paymentBankName ?? body.settings?.paymentBankName ?? "");
      setDraftNotes(body.invoice.notes ?? "");
      setDraftPrimaryColor(
        expandHexColor(body.invoice.businessPrimaryColor) ??
          expandHexColor(body.settings?.brandColor ?? null) ??
          ""
      );
      const baseItems = (body.items ?? []).map(itemToDraft);
      setDraftItems(
        baseItems.length > 0
          ? baseItems
          : [
              {
                key: newLocalKey(),
                serverId: null,
                description: "Prestation",
                quantity: "1",
                unitPrice: "0",
              },
            ]
      );
    } catch (e) {
      toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setLoading(false);
    }
  }, [invoiceId, toast]);

  useEffect(() => {
    if (!ready || !invoiceId) return;
    void fetchInvoice();
  }, [ready, invoiceId, fetchInvoice]);

  const previewItems: InvoiceItem[] = useMemo(
    () =>
      draftItems.map((it, idx) => {
        const qty = parseQuantity(it.quantity);
        const unit = parseUnit(it.unitPrice);
        return {
          id: it.serverId ?? it.key,
          position: idx,
          description: it.description,
          quantity: qty,
          unitPrice: unit,
          total: Math.round(qty * unit),
        };
      }),
    [draftItems]
  );

  const totals = useMemo(
    () =>
      recomputeTotals(
        draftItems.map((it) => ({
          quantity: parseQuantity(it.quantity),
          unitPrice: parseUnit(it.unitPrice),
        })),
        parseUnit(draftDiscount)
      ),
    [draftItems, draftDiscount]
  );

  const previewInvoice: InvoiceRecord | null = useMemo(() => {
    if (!serverInvoice) return null;
    return {
      ...serverInvoice,
      status: draftStatus,
      customerName: draftCustomerName.trim() || "Client",
      customerEmail: draftCustomerEmail.trim() || null,
      customerPhone: draftCustomerPhone.trim() || null,
      customerAddress: draftCustomerAddress.trim() || null,
      issueDate: draftIssueDate || serverInvoice.issueDate,
      dueDate: draftDueDate || null,
      notes: draftNotes.trim() || null,
      paymentTerms: draftPaymentTerms.trim() || null,
      paymentIban: draftPaymentIban.trim() || null,
      paymentAccountHolder: draftPaymentHolder.trim() || null,
      paymentBankName: draftPaymentBank.trim() || null,
      businessPrimaryColor:
        expandHexColor(draftPrimaryColor) ?? serverInvoice.businessPrimaryColor,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      totalAmount: totals.total,
    };
  }, [
    serverInvoice,
    draftStatus,
    draftCustomerName,
    draftCustomerEmail,
    draftCustomerPhone,
    draftCustomerAddress,
    draftIssueDate,
    draftDueDate,
    draftNotes,
    draftPaymentTerms,
    draftPaymentIban,
    draftPaymentHolder,
    draftPaymentBank,
    draftPrimaryColor,
    totals,
  ]);

  const isDirty = useMemo(() => {
    if (!serverInvoice) return false;
    if (draftStatus !== serverInvoice.status) return true;
    if (draftCustomerName !== (serverInvoice.customerName ?? "")) return true;
    if (draftCustomerEmail !== (serverInvoice.customerEmail ?? "")) return true;
    if (draftCustomerPhone !== (serverInvoice.customerPhone ?? "")) return true;
    if (draftCustomerAddress !== (serverInvoice.customerAddress ?? "")) return true;
    if (draftIssueDate !== (serverInvoice.issueDate ?? "")) return true;
    if (draftDueDate !== (serverInvoice.dueDate ?? "")) return true;
    if (draftNotes !== (serverInvoice.notes ?? "")) return true;
    if (draftPaymentTerms !== (serverInvoice.paymentTerms ?? "")) return true;
    if (draftPaymentIban !== (serverInvoice.paymentIban ?? "")) return true;
    if (draftPaymentHolder !== (serverInvoice.paymentAccountHolder ?? "")) return true;
    if (draftPaymentBank !== (serverInvoice.paymentBankName ?? "")) return true;
    if (
      (expandHexColor(draftPrimaryColor) ?? "") !==
      (expandHexColor(serverInvoice.businessPrimaryColor) ?? "")
    )
      return true;
    if (parseUnit(draftDiscount) !== Math.max(0, serverInvoice.discountAmount ?? 0)) return true;
    if (draftItems.length !== serverItems.length) return true;
    for (let i = 0; i < draftItems.length; i++) {
      const d = draftItems[i];
      const s = serverItems[i];
      if (!s) return true;
      if (d.serverId !== s.id) return true;
      if (d.description !== (s.description ?? "")) return true;
      if (parseQuantity(d.quantity) !== Number(s.quantity ?? 1)) return true;
      if (parseUnit(d.unitPrice) !== Number(s.unitPrice ?? 0)) return true;
    }
    return false;
  }, [
    serverInvoice,
    serverItems,
    draftStatus,
    draftCustomerName,
    draftCustomerEmail,
    draftCustomerPhone,
    draftCustomerAddress,
    draftIssueDate,
    draftDueDate,
    draftNotes,
    draftPaymentTerms,
    draftPaymentIban,
    draftPaymentHolder,
    draftPaymentBank,
    draftPrimaryColor,
    draftDiscount,
    draftItems,
  ]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    if (!serverInvoice) return;
    if (saving) return;
    setSaving(true);
    try {
      const cleanedItems = draftItems
        .map((it) => ({
          id: it.serverId ?? null,
          description: it.description.trim(),
          quantity: parseQuantity(it.quantity),
          unitPrice: parseUnit(it.unitPrice),
        }))
        .filter((it) => it.description.length > 0 || it.unitPrice > 0 || it.quantity > 0);
      if (cleanedItems.length === 0) {
        toast.push({
          kind: "error",
          message: "Ajoute au moins une ligne avant d'enregistrer.",
        });
        return;
      }
      const payload = {
        status: draftStatus,
        customerName: draftCustomerName.trim() || "Client",
        customerEmail: draftCustomerEmail.trim() || null,
        customerPhone: draftCustomerPhone.trim() || null,
        customerAddress: draftCustomerAddress.trim() || null,
        issueDate: draftIssueDate || null,
        dueDate: draftDueDate || null,
        notes: draftNotes.trim() || null,
        paymentTerms: draftPaymentTerms.trim() || null,
        paymentIban: draftPaymentIban.trim() || null,
        paymentAccountHolder: draftPaymentHolder.trim() || null,
        paymentBankName: draftPaymentBank.trim() || null,
        primaryColor: expandHexColor(draftPrimaryColor) ?? null,
        discountAmount: parseUnit(draftDiscount),
        items: cleanedItems,
      };
      const res = await fetch(`/api/invoices/${serverInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      const body = (await res.json().catch(() => ({}))) as {
        invoice?: InvoiceRecord;
        items?: InvoiceItem[];
        error?: string;
      };
      if (!res.ok || !body.invoice) {
        throw new Error(body.error ?? "La sauvegarde a échoué.");
      }
      setServerInvoice(body.invoice);
      setServerItems(body.items ?? []);
      const baseItems = (body.items ?? []).map(itemToDraft);
      setDraftItems(
        baseItems.length > 0
          ? baseItems
          : [
              {
                key: newLocalKey(),
                serverId: null,
                description: "Prestation",
                quantity: "1",
                unitPrice: "0",
              },
            ]
      );
      setDraftStatus(body.invoice.status);
      setDraftDiscount(String(Math.max(0, body.invoice.discountAmount ?? 0)));
      toast.push({ message: "Facture enregistrée." });
    } catch (e) {
      toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setSaving(false);
    }
  }, [
    serverInvoice,
    saving,
    draftItems,
    draftStatus,
    draftCustomerName,
    draftCustomerEmail,
    draftCustomerPhone,
    draftCustomerAddress,
    draftIssueDate,
    draftDueDate,
    draftNotes,
    draftPaymentTerms,
    draftPaymentIban,
    draftPaymentHolder,
    draftPaymentBank,
    draftPrimaryColor,
    draftDiscount,
    toast,
  ]);

  const handleDownloadPdf = useCallback(async () => {
    if (!serverInvoice) return;
    if (isDirty) {
      const ok = window.confirm(
        "Des modifications ne sont pas enregistrées. Le PDF sera généré à partir de la version sauvegardée. Continuer ?"
      );
      if (!ok) return;
    }
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${serverInvoice.id}/pdf`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "La génération du PDF a échoué.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-${serverInvoice.invoiceNumber || serverInvoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setDownloading(false);
    }
  }, [serverInvoice, isDirty, toast]);

  const handleDelete = useCallback(async () => {
    if (!serverInvoice) return;
    if (!window.confirm("Supprimer définitivement cette facture ?")) return;
    try {
      const res = await fetch(`/api/invoices/${serverInvoice.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Suppression impossible.");
      toast.push({ message: "Facture supprimée." });
      router.push("/dashboard/factures");
    } catch (e) {
      toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
    }
  }, [serverInvoice, toast, router]);

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
          description="La facturation est réservée au plan Pro."
          actions={
            <Link href="/dashboard/facturation#waevon-pricing" className={btnPrimaryClass}>
              Passer au plan Pro
            </Link>
          }
        />
        <div className={cardClass}>
          <p className="text-sm text-neutral-700">
            Cette page est verrouillée pour le plan Starter.{" "}
            <Link href="/dashboard/facturation#waevon-pricing" className={`${linkClass}`}>
              Voir les offres
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !serverInvoice || !previewInvoice) {
    return (
      <div className="space-y-8 pb-8">
        <PageHeader
          title="Facture introuvable"
          description="Cette facture n'existe pas ou n'est plus accessible."
        />
        <Link href="/dashboard/factures" className={btnGhostClass}>
          ← Retour aux factures
        </Link>
      </div>
    );
  }

  const currencyAffix = currencyFieldAffix(serverInvoice.currency);
  const previewKeyColor = resolvePrimaryColor(previewInvoice, settings);
  const fileName = `facture-${serverInvoice.invoiceNumber || serverInvoice.id}.pdf`;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Facture ${serverInvoice.invoiceNumber || ""}`.trim()}
        description={
          serverInvoice.reservationStartAt
            ? `Liée à un rendez-vous · couleur ${previewKeyColor}`
            : `Facture indépendante · couleur ${previewKeyColor}`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/factures" className={btnGhostClass}>
              ← Retour
            </Link>
            <button
              type="button"
              className={btnSecondaryClass}
              onClick={() => setPreviewOpen(true)}
            >
              Aperçu de la facture
            </button>
            <button
              type="button"
              className={btnGhostClass}
              onClick={() => void handleDownloadPdf()}
              disabled={downloading}
            >
              {downloading ? "Génération…" : "Télécharger PDF"}
            </button>
            <button
              type="button"
              className={btnPrimaryClass}
              onClick={() => void handleSave()}
              disabled={saving || !isDirty}
              title={!isDirty ? "Aucune modification" : undefined}
            >
              {saving ? "Enregistrement…" : isDirty ? "Enregistrer" : "Enregistré"}
            </button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-neutral-950">Statut & dates</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass}>Statut</label>
                <select
                  className={`${inputClass} mt-2`}
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value as InvoiceStatus)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Couleur principale</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    className="h-11 w-14 cursor-pointer rounded-2xl border border-neutral-200/90 bg-white p-1"
                    value={expandHexColor(draftPrimaryColor) ?? "#0a0a0a"}
                    onChange={(e) => setDraftPrimaryColor(e.target.value)}
                    aria-label="Couleur de la facture"
                  />
                  <input
                    className={inputClass}
                    placeholder="#0a0a0a"
                    value={draftPrimaryColor}
                    onChange={(e) => setDraftPrimaryColor(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Date d&apos;émission</label>
                <input
                  type="date"
                  className={`${inputClass} mt-2`}
                  value={draftIssueDate ?? ""}
                  onChange={(e) => setDraftIssueDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Date d&apos;échéance</label>
                <input
                  type="date"
                  className={`${inputClass} mt-2`}
                  value={draftDueDate ?? ""}
                  onChange={(e) => setDraftDueDate(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-base font-semibold text-neutral-950">Client</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nom</label>
                <input
                  className={`${inputClass} mt-2 ${userTextBreakClass}`}
                  value={draftCustomerName}
                  onChange={(e) => setDraftCustomerName(e.target.value)}
                  placeholder="Nom du client"
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  className={`${inputClass} mt-2`}
                  value={draftCustomerEmail}
                  onChange={(e) => setDraftCustomerEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input
                  className={`${inputClass} mt-2`}
                  value={draftCustomerPhone}
                  onChange={(e) => setDraftCustomerPhone(e.target.value)}
                  placeholder="+41 …"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Adresse</label>
                <textarea
                  className={`${textareaClass} mt-2 min-h-[88px] ${userTextBreakClass}`}
                  value={draftCustomerAddress}
                  onChange={(e) => setDraftCustomerAddress(e.target.value)}
                  placeholder={`Rue Exemple 12\n1000 Lausanne`}
                />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-950">Lignes de facturation</h2>
              <button
                type="button"
                className={btnGhostClass + " text-sm"}
                onClick={() =>
                  setDraftItems((prev) => [
                    ...prev,
                    {
                      key: newLocalKey(),
                      serverId: null,
                      description: "",
                      quantity: "1",
                      unitPrice: "0",
                    },
                  ])
                }
              >
                + Ajouter une ligne
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {draftItems.map((it, idx) => (
                <div
                  key={it.key}
                  className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4"
                >
                  <div className="grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-12">
                      <label className={labelClass}>Description</label>
                      <textarea
                        className={`${textareaClass} mt-2 min-h-[64px] ${userTextBreakClass}`}
                        value={it.description}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((p, pIdx) =>
                              pIdx === idx ? { ...p, description: e.target.value } : p
                            )
                          )
                        }
                        placeholder="Prestation ou produit"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className={labelClass}>Quantité</label>
                      <input
                        inputMode="decimal"
                        className={`${inputClass} mt-2 tabular-nums`}
                        value={it.quantity}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((p, pIdx) =>
                              pIdx === idx ? { ...p, quantity: e.target.value } : p
                            )
                          )
                        }
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className={labelClass}>Prix unitaire ({currencyAffix})</label>
                      <input
                        inputMode="decimal"
                        className={`${inputClass} mt-2 tabular-nums`}
                        value={it.unitPrice}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((p, pIdx) =>
                              pIdx === idx ? { ...p, unitPrice: e.target.value } : p
                            )
                          )
                        }
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className={labelClass}>Total ligne</label>
                      <p className="mt-2 inline-flex h-11 w-full items-center justify-end rounded-2xl border border-transparent bg-white px-4 text-sm font-medium tabular-nums text-neutral-900">
                        {(parseQuantity(it.quantity) * parseUnit(it.unitPrice)).toLocaleString(
                          "fr-CH"
                        )}{" "}
                        {currencyAffix}
                      </p>
                    </div>
                    <div className="md:col-span-2 md:flex md:items-end md:justify-end">
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600/90 underline-offset-4 hover:underline disabled:opacity-50"
                        disabled={draftItems.length <= 1}
                        onClick={() =>
                          setDraftItems((prev) => prev.filter((_, pIdx) => pIdx !== idx))
                        }
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-base font-semibold text-neutral-950">Informations de paiement</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Affichées sur la facture, en bas du document. Préremplies depuis tes paramètres de
              facturation, modifiables par facture.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>IBAN</label>
                <input
                  className={`${inputClass} mt-2 tabular-nums ${userTextBreakClass}`}
                  value={draftPaymentIban}
                  onChange={(e) => setDraftPaymentIban(e.target.value)}
                  placeholder="CH00 0000 0000 0000 0000 0"
                />
              </div>
              <div>
                <label className={labelClass}>Titulaire du compte</label>
                <input
                  className={`${inputClass} mt-2 ${userTextBreakClass}`}
                  value={draftPaymentHolder}
                  onChange={(e) => setDraftPaymentHolder(e.target.value)}
                  placeholder="Nom du commerce"
                />
              </div>
              <div>
                <label className={labelClass}>Banque</label>
                <input
                  className={`${inputClass} mt-2 ${userTextBreakClass}`}
                  value={draftPaymentBank}
                  onChange={(e) => setDraftPaymentBank(e.target.value)}
                  placeholder="Banque Cantonale Vaudoise"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Conditions de paiement</label>
                <textarea
                  className={`${textareaClass} mt-2 min-h-[72px] ${userTextBreakClass}`}
                  value={draftPaymentTerms}
                  onChange={(e) => setDraftPaymentTerms(e.target.value)}
                  placeholder="Paiement à 30 jours, virement bancaire."
                />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-base font-semibold text-neutral-950">Totaux & notes</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Rabais ({currencyAffix})</label>
                <input
                  inputMode="decimal"
                  className={`${inputClass} mt-2 tabular-nums`}
                  value={draftDiscount}
                  onChange={(e) => setDraftDiscount(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes</label>
                <textarea
                  className={`${textareaClass} mt-2 min-h-[80px] ${userTextBreakClass}`}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Informations complémentaires visibles sur la facture"
                />
              </div>
            </div>
            <div className="mt-6 grid gap-2 rounded-2xl bg-neutral-50/80 p-4 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-neutral-600">Sous-total</span>
                <span className="tabular-nums text-neutral-800">
                  {totals.subtotal.toLocaleString("fr-CH")} {currencyAffix}
                </span>
              </div>
              {totals.discountAmount > 0 ? (
                <div className="flex items-baseline justify-between">
                  <span className="text-neutral-600">Rabais</span>
                  <span className="tabular-nums text-neutral-800">
                    - {totals.discountAmount.toLocaleString("fr-CH")} {currencyAffix}
                  </span>
                </div>
              ) : null}
              <div className="mt-1 flex items-baseline justify-between border-t border-neutral-200 pt-2">
                <span className="font-semibold text-neutral-950">Total à payer</span>
                <span className="text-base font-semibold tabular-nums text-neutral-950">
                  {totals.total.toLocaleString("fr-CH")} {currencyAffix}
                </span>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-base font-semibold text-red-700">Zone sensible</h2>
            <p className="mt-1 text-sm text-neutral-600">
              La suppression est définitive et retire la facture des historiques.
            </p>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Supprimer la facture
            </button>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className={`${cardClass} space-y-4`}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Récap rapide
            </h2>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-500">Numéro</span>
              <span className="font-medium text-neutral-950">
                {serverInvoice.invoiceNumber || "—"}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-500">Statut</span>
              <span className="font-medium text-neutral-950">
                {STATUS_OPTIONS.find((o) => o.value === draftStatus)?.label}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-500">Total</span>
              <span className="font-semibold text-neutral-950 tabular-nums">
                {totals.total.toLocaleString("fr-CH")} {currencyAffix}
              </span>
            </div>
            <div className="grid gap-2 pt-2">
              <button
                type="button"
                className={btnSecondaryClass}
                onClick={() => setPreviewOpen(true)}
              >
                Aperçu de la facture
              </button>
              <button
                type="button"
                className={btnGhostClass}
                onClick={() => void handleDownloadPdf()}
                disabled={downloading}
              >
                {downloading ? "Génération…" : "Télécharger PDF"}
              </button>
              <button
                type="button"
                className={btnPrimaryClass}
                onClick={() => void handleSave()}
                disabled={saving || !isDirty}
              >
                {saving ? "Enregistrement…" : isDirty ? "Enregistrer" : "Enregistré"}
              </button>
            </div>
            {isDirty ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Modifications non enregistrées. L&apos;aperçu utilise tes valeurs en cours.
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      <InvoicePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        invoice={previewInvoice}
        items={previewItems}
        settings={settings}
        business={business}
        fileName={fileName}
      />
    </div>
  );
}
