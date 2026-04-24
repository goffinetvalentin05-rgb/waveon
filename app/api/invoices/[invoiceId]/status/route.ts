import { NextRequest, NextResponse } from "next/server";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireProInvoicesAccess } from "@/lib/subscription/require-pro-invoices-access";

export const runtime = "nodejs";

type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const id = (invoiceId ?? "").trim();
  if (!id) return NextResponse.json({ error: "invoiceId manquant." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as null | { status?: InvoiceStatus };
  const nextStatus = body?.status ?? null;
  if (
    nextStatus !== "draft" &&
    nextStatus !== "sent" &&
    nextStatus !== "paid" &&
    nextStatus !== "cancelled"
  ) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;
  const { supabase, businessId } = gate;

  const patch: Record<string, unknown> = { status: nextStatus };
  const nowIso = new Date().toISOString();
  if (nextStatus === "sent") patch.sent_at = nowIso;
  if (nextStatus === "paid") patch.paid_at = nowIso;
  if (nextStatus === "cancelled") patch.cancelled_at = nowIso;

  const { error } = await supabase
    .from(WavonDbTable.invoices)
    .update(patch)
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("[api/invoices/status] update error:", error);
    return NextResponse.json({ error: "Impossible de mettre à jour la facture." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

