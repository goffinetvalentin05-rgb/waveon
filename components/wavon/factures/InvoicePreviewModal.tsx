"use client";

import { useEffect, useMemo } from "react";
import { BlobProvider, PDFViewer } from "@react-pdf/renderer";
import {
  InvoiceTemplate,
  type InvoiceTemplateBusiness,
} from "@/components/wavon/factures/InvoiceTemplate";
import type {
  InvoiceItem,
  InvoiceRecord,
  InvoiceSettings,
} from "@/lib/invoices/invoice-model";
import { btnGhostClass, btnPrimaryClass, spinnerClass } from "@/lib/wavon/tokens";

type Props = {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceRecord;
  items: InvoiceItem[];
  settings: InvoiceSettings | null;
  business: InvoiceTemplateBusiness | null;
  fileName: string;
};

export function InvoicePreviewModal({
  open,
  onClose,
  invoice,
  items,
  settings,
  business,
  fileName,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const document_ = useMemo(
    () => (
      <InvoiceTemplate invoice={invoice} items={items} settings={settings} business={business} />
    ),
    [invoice, items, settings, business]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch justify-center bg-neutral-950/40 p-3 backdrop-blur-[3px] sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fermer l'aperçu"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[91] flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="text-base font-semibold tracking-tight text-neutral-950">
              Aperçu de la facture
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Rendu identique au PDF · {invoice.invoiceNumber || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BlobProvider document={document_}>
              {({ url, loading, error }) => {
                if (error) {
                  return (
                    <span className="text-xs text-red-600">Erreur lors de la génération.</span>
                  );
                }
                return (
                  <a
                    href={url ?? "#"}
                    download={fileName}
                    aria-disabled={loading || !url}
                    className={`${btnPrimaryClass} ${
                      loading || !url ? "pointer-events-none opacity-60" : ""
                    }`}
                    onClick={(e) => {
                      if (loading || !url) e.preventDefault();
                    }}
                  >
                    {loading ? "Préparation…" : "Télécharger PDF"}
                  </a>
                );
              }}
            </BlobProvider>
            <button type="button" className={btnGhostClass} onClick={onClose}>
              Fermer
            </button>
          </div>
        </header>

        <div className="flex-1 bg-neutral-100">
          <PDFViewer
            showToolbar={false}
            style={{ width: "100%", height: "100%", border: "none" }}
          >
            {document_}
          </PDFViewer>
        </div>

        <noscript>
          <div className="flex items-center justify-center gap-3 border-t border-neutral-100 bg-white px-5 py-3 text-xs text-neutral-500">
            <span className={spinnerClass} aria-hidden />
            Activation de l&apos;aperçu…
          </div>
        </noscript>
      </div>
    </div>
  );
}
