/**
 * Génère le PDF de la facture via le composant unifié `InvoiceTemplate`.
 * Le même composant est utilisé pour l'aperçu côté client (modale) et le PDF côté serveur,
 * pour garantir un rendu strictement identique.
 */

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import {
  InvoiceTemplate,
  type InvoiceTemplateBusiness,
} from "@/components/wavon/factures/InvoiceTemplate";
import type { InvoiceItem, InvoiceRecord, InvoiceSettings } from "@/lib/invoices/invoice-model";

export type BusinessPdfRow = InvoiceTemplateBusiness;

export async function buildInvoicePdfBuffer(args: {
  invoice: InvoiceRecord;
  items: InvoiceItem[];
  business: BusinessPdfRow;
  settings: InvoiceSettings | null;
}): Promise<Uint8Array> {
  const { invoice, items, business, settings } = args;
  // `InvoiceTemplate` retourne `<Document>` ; on cast explicitement pour satisfaire `renderToBuffer`.
  const element = createElement(InvoiceTemplate, {
    invoice,
    items,
    business,
    settings,
  }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);
  return new Uint8Array(buffer);
}
