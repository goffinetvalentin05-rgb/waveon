import { NextRequest, NextResponse } from "next/server";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { requireProInvoicesAccess } from "@/lib/subscription/require-pro-invoices-access";
import { getEffectiveSubscription } from "@/lib/subscription/workspace-access";
import { userMessageForInvoiceRpcError } from "@/lib/invoices/invoice-api-errors";

export const runtime = "nodejs";

const INVOICE_DEBUG = (process.env.WAVON_INVOICE_DEBUG ?? "").trim() === "1";

export async function GET() {
  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;

  const { data, error } = await gate.supabase
    .from(WavonDbTable.invoices)
    .select(
      "id,invoice_number,status,client_name,service_name,service_price,total_amount,currency,reservation_start_at,issue_date,created_at"
    )
    .eq("business_id", gate.businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[api/invoices] list error:", error);
    return NextResponse.json({ error: "Impossible de charger les factures." }, { status: 500 });
  }

  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(req: NextRequest) {
  const gate = await requireProInvoicesAccess();
  if (!gate.ok) return gate.res;

  const body = (await req.json().catch(() => null)) as null | { reservationId?: string };
  const reservationId = body?.reservationId?.trim() ?? "";
  if (!reservationId) {
    return NextResponse.json({ error: "reservationId requis." }, { status: 400 });
  }

  const { supabase, businessId } = gate;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;

  const effective = await getEffectiveSubscription(
    { id: user?.id ?? "", email: user?.email },
    { workspaceId: businessId, supabase }
  );

  const { data: resv, error: resvErr } = await supabase
    .from(WavonDbTable.reservations)
    .select("id,business_id,client_id,service_id,client_name,start_at")
    .eq("id", reservationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (resvErr || !resv) {
    return NextResponse.json(
      { error: "Réservation introuvable pour ce commerce.", code: "not_found" },
      { status: 404 }
    );
  }

  const { data: svc } = await supabase
    .from(WavonDbTable.services)
    .select("id,price,name")
    .eq("id", resv.service_id)
    .maybeSingle();

  const { data: preexisting } = await supabase
    .from(WavonDbTable.invoices)
    .select("id")
    .eq("business_id", businessId)
    .eq("reservation_id", reservationId)
    .maybeSingle();

  if (preexisting?.id) {
    if (INVOICE_DEBUG) {
      console.error("[api/invoices] facture déjà présente, ouverture", {
        reservationId,
        businessId,
        clientId: resv.client_id,
        serviceId: resv.service_id,
        servicePrice: svc?.price,
        userEmail: email,
        plan: effective.plan,
        invoiceId: preexisting.id,
      });
    }
    return NextResponse.json({ id: preexisting.id, existed: true, code: "existing" });
  }

  if (INVOICE_DEBUG) {
    console.error("[api/invoices] appel RPC création", {
      reservationId,
      businessId,
      clientId: resv.client_id,
      serviceId: resv.service_id,
      servicePrice: svc?.price,
      userEmail: email,
      plan: effective.plan,
      canUseInvoices: effective.canUseInvoices,
    });
  }

  const { data, error } = await supabase.rpc("wavon_create_invoice_from_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) {
    const mapped = userMessageForInvoiceRpcError(error, {
      businessId,
      reservationId,
      resv,
      svc,
      userEmail: email,
      plan: effective.plan,
      full: error,
    });
    console.error("[api/invoices] erreur RPC (détail) :", mapped.logMessage, error);

    const { data: existingAfter } = await supabase
      .from(WavonDbTable.invoices)
      .select("id")
      .eq("business_id", businessId)
      .eq("reservation_id", reservationId)
      .maybeSingle();
    if (existingAfter?.id) {
      return NextResponse.json({ id: existingAfter.id, existed: true, code: "existing" });
    }

    return NextResponse.json(
      { error: mapped.userMessage, code: mapped.code },
      { status: mapped.status }
    );
  }

  const invoiceId = typeof data === "string" ? data : null;
  if (!invoiceId) {
    return NextResponse.json({ error: "Réponse serveur invalide." }, { status: 500 });
  }
  if (INVOICE_DEBUG) {
    console.error("[api/invoices] facture créée", {
      reservationId,
      businessId,
      invoiceId,
      userEmail: email,
      plan: effective.plan,
    });
  }
  return NextResponse.json({ id: invoiceId, existed: false });
}
