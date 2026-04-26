import { NextRequest, NextResponse } from "next/server";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireProInvoicesAccess } from "@/lib/subscription/require-pro-invoices-access";
import {
  INVOICE_ITEM_PROJECTION,
  INVOICE_PROJECTION,
  isValidHexColor,
  mapInvoiceRow,
  mapInvoiceSettings,
  mapItemRow,
  recomputeTotals,
  type InvoiceItem,
  type InvoiceStatus,
} from "@/lib/invoices/invoice-model";

export const runtime = "nodejs";

const INVOICE_DEBUG = (process.env.WAVON_INVOICE_DEBUG ?? "").trim() === "1";

const ALLOWED_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "cancelled"];

type ItemPayload = {
  id?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
};

type PatchPayload = {
  status?: InvoiceStatus | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  discountAmount?: number | string | null;
  primaryColor?: string | null;
  items?: ItemPayload[] | null;
};

function toInt(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, "."));
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function toDecimal(value: unknown, fallback = 1): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, "."));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 100) / 100;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}

function normalizeIsoDate(value: unknown): string | null {
  const t = trimOrNull(value);
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const id = (invoiceId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "invoiceId manquant." }, { status: 400 });
  }

  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;
  const { supabase, businessId } = gate;

  const { data: invoiceRow, error: invErr } = await supabase
    .from(WavonDbTable.invoices)
    .select(INVOICE_PROJECTION)
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (invErr || !invoiceRow) {
    return NextResponse.json({ error: "Cette facture est introuvable." }, { status: 404 });
  }

  const { data: itemRows } = await supabase
    .from("wavon_invoice_items")
    .select(INVOICE_ITEM_PROJECTION)
    .eq("invoice_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: settingsRow } = await supabase
    .from(WavonDbTable.invoiceSettings)
    .select(
      "auto_create_on_confirmed,company_name,company_address,company_email,company_phone,company_vat_ide,payment_terms,brand_color,legal_footer,updated_at"
    )
    .eq("business_id", businessId)
    .maybeSingle();

  const { data: businessRow } = await supabase
    .from(WavonDbTable.businesses)
    .select("business_name,email,phone,address,city,postal_code,public_logo_url,public_accent_color")
    .eq("id", businessId)
    .single();

  return NextResponse.json({
    invoice: mapInvoiceRow(invoiceRow as unknown as Record<string, unknown>),
    items: (itemRows ?? []).map((r) => mapItemRow(r as unknown as Record<string, unknown>)),
    settings: mapInvoiceSettings(settingsRow as unknown as Record<string, unknown> | null),
    business: businessRow ?? null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const id = (invoiceId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "invoiceId manquant." }, { status: 400 });
  }

  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;
  const { supabase, businessId } = gate;

  const body = (await req.json().catch(() => null)) as PatchPayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { data: existingRaw, error: existingErr } = await supabase
    .from(WavonDbTable.invoices)
    .select("id,status,sent_at,paid_at,cancelled_at,discount_amount")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (existingErr || !existingRaw) {
    return NextResponse.json({ error: "Cette facture est introuvable." }, { status: 404 });
  }

  const existing = existingRaw as unknown as {
    id: string;
    status: InvoiceStatus;
    sent_at: string | null;
    paid_at: string | null;
    cancelled_at: string | null;
    discount_amount: number | null;
  };

  const patch: Record<string, unknown> = {};
  const nowIso = new Date().toISOString();

  if (body.status !== undefined && body.status !== null) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === "sent" && !existing.sent_at) patch.sent_at = nowIso;
    if (body.status === "paid" && !existing.paid_at) patch.paid_at = nowIso;
    if (body.status === "cancelled" && !existing.cancelled_at) patch.cancelled_at = nowIso;
    if (body.status === "draft") {
      patch.sent_at = null;
      patch.paid_at = null;
      patch.cancelled_at = null;
    }
  }

  if (body.customerName !== undefined) {
    const value = trimOrNull(body.customerName);
    patch.client_name = value ?? "Client";
  }
  if (body.customerEmail !== undefined) {
    patch.client_email = trimOrNull(body.customerEmail);
  }
  if (body.customerPhone !== undefined) {
    patch.client_phone = trimOrNull(body.customerPhone);
  }
  if (body.customerAddress !== undefined) {
    patch.client_address = trimOrNull(body.customerAddress);
  }
  if (body.issueDate !== undefined) {
    patch.issue_date = normalizeIsoDate(body.issueDate) ?? null;
    if (patch.issue_date === null) {
      delete patch.issue_date;
    }
  }
  if (body.dueDate !== undefined) {
    patch.due_date = normalizeIsoDate(body.dueDate);
  }
  if (body.notes !== undefined) {
    patch.notes = trimOrNull(body.notes);
  }
  if (body.paymentTerms !== undefined) {
    patch.payment_terms = trimOrNull(body.paymentTerms);
  }
  if (body.primaryColor !== undefined) {
    const v = trimOrNull(body.primaryColor);
    if (v && !isValidHexColor(v)) {
      return NextResponse.json({ error: "Couleur invalide (utiliser un code hexadécimal)." }, { status: 400 });
    }
    patch.business_primary_color = v;
  }

  const wantsItemsUpdate = Array.isArray(body.items);
  let normalizedItems: Array<{
    id: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }> = [];

  if (wantsItemsUpdate) {
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "Ajoute au moins une ligne à la facture." }, { status: 400 });
    }
    normalizedItems = body.items.map((it) => {
      const qty = toDecimal(it.quantity, 1);
      const unit = toInt(it.unitPrice, 0);
      const total = Math.round(qty * unit);
      return {
        id: typeof it.id === "string" && it.id.length > 0 ? it.id : null,
        description: trimOrNull(it.description) ?? "",
        quantity: qty,
        unit_price: unit,
        total,
      };
    });
  }

  let newDiscount: number | null = null;
  if (body.discountAmount !== undefined) {
    newDiscount = Math.max(0, toInt(body.discountAmount, 0));
    patch.discount_amount = newDiscount;
  }

  if (wantsItemsUpdate || newDiscount !== null) {
    const rawItems = wantsItemsUpdate
      ? normalizedItems.map((it) => ({
          quantity: it.quantity,
          unitPrice: it.unit_price,
          total: it.total,
        }))
      : (((
          await supabase
            .from("wavon_invoice_items")
            .select("quantity,unit_price,total")
            .eq("invoice_id", id)
        ).data ?? []) as unknown as Array<Record<string, unknown>>
        ).map((r) => ({
          quantity: Number(r.quantity ?? 1),
          unitPrice: Number(r.unit_price ?? 0),
          total: Number(r.total ?? 0),
        }));
    const effectiveDiscount =
      newDiscount !== null ? newDiscount : Math.max(0, Number(existing.discount_amount ?? 0));
    const totals = recomputeTotals(rawItems, effectiveDiscount);
    patch.subtotal = totals.subtotal;
    patch.discount_amount = totals.discountAmount;
    patch.total_amount = totals.total;
  }

  if (Object.keys(patch).length === 0 && !wantsItemsUpdate) {
    return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
  }

  if (Object.keys(patch).length > 0) {
    const { error: upErr } = await supabase
      .from(WavonDbTable.invoices)
      .update(patch)
      .eq("id", id)
      .eq("business_id", businessId);
    if (upErr) {
      console.error("[api/invoices/PATCH] update invoice error:", upErr, { id, businessId, patch });
      return NextResponse.json({ error: "La sauvegarde a échoué côté serveur." }, { status: 500 });
    }
  }

  if (wantsItemsUpdate) {
    const keepIds = normalizedItems.map((it) => it.id).filter((v): v is string => Boolean(v));
    let delQuery = supabase.from("wavon_invoice_items").delete().eq("invoice_id", id);
    if (keepIds.length > 0) {
      delQuery = delQuery.not("id", "in", `(${keepIds.map((i) => `"${i}"`).join(",")})`);
    }
    const { error: delErr } = await delQuery;
    if (delErr) {
      console.error("[api/invoices/PATCH] delete items error:", delErr);
      return NextResponse.json({ error: "Impossible de mettre à jour les lignes." }, { status: 500 });
    }

    const inserts: Array<{
      invoice_id: string;
      position: number;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }> = [];
    const updates: Array<{
      id: string;
      position: number;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }> = [];

    normalizedItems.forEach((it, index) => {
      if (it.id) {
        updates.push({
          id: it.id,
          position: index,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total: it.total,
        });
      } else {
        inserts.push({
          invoice_id: id,
          position: index,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total: it.total,
        });
      }
    });

    for (const up of updates) {
      const { error: uErr } = await supabase
        .from("wavon_invoice_items")
        .update({
          position: up.position,
          description: up.description,
          quantity: up.quantity,
          unit_price: up.unit_price,
          total: up.total,
        })
        .eq("id", up.id)
        .eq("invoice_id", id);
      if (uErr) {
        console.error("[api/invoices/PATCH] update item error:", uErr, up);
        return NextResponse.json({ error: "La mise à jour d'une ligne a échoué." }, { status: 500 });
      }
    }
    if (inserts.length > 0) {
      const { error: iErr } = await supabase.from("wavon_invoice_items").insert(inserts);
      if (iErr) {
        console.error("[api/invoices/PATCH] insert items error:", iErr, { inserts });
        return NextResponse.json({ error: "La création d'une ligne a échoué." }, { status: 500 });
      }
    }
  }

  if (INVOICE_DEBUG) {
    console.error("[api/invoices/PATCH] OK", { id, businessId, patch, items: wantsItemsUpdate });
  }

  // Renvoie la version mise à jour pour permettre une mise à jour optimiste côté client.
  const { data: invoiceRow } = await supabase
    .from(WavonDbTable.invoices)
    .select(INVOICE_PROJECTION)
    .eq("id", id)
    .eq("business_id", businessId)
    .single();
  const { data: itemRows } = await supabase
    .from("wavon_invoice_items")
    .select(INVOICE_ITEM_PROJECTION)
    .eq("invoice_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  return NextResponse.json({
    invoice: invoiceRow ? mapInvoiceRow(invoiceRow as unknown as Record<string, unknown>) : null,
    items: (itemRows ?? []).map(
      (r) => mapItemRow(r as unknown as Record<string, unknown>)
    ) as InvoiceItem[],
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const id = (invoiceId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "invoiceId manquant." }, { status: 400 });
  }

  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;
  const { supabase, businessId } = gate;

  const { error } = await supabase
    .from(WavonDbTable.invoices)
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("[api/invoices/DELETE] error:", error, { id, businessId });
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
