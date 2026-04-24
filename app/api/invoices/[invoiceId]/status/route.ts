import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { canAccessFeature } from "@/lib/subscription/access";

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

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: business } = await supabase
    .from(WavonDbTable.businesses)
    .select("id, subscription_status, subscription_plan")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!business?.id) return NextResponse.json({ error: "Commerce introuvable." }, { status: 404 });

  const status = String((business as { subscription_status?: unknown }).subscription_status ?? "");
  const plan = (business as { subscription_plan?: string | null }).subscription_plan ?? null;
  if (!canAccessFeature({ status, plan }, "invoices")) {
    return NextResponse.json(
      { error: "La création de factures est disponible avec le plan Pro.", code: "feature_locked" },
      { status: 403 }
    );
  }

  const patch: Record<string, unknown> = { status: nextStatus };
  const nowIso = new Date().toISOString();
  if (nextStatus === "sent") patch.sent_at = nowIso;
  if (nextStatus === "paid") patch.paid_at = nowIso;
  if (nextStatus === "cancelled") patch.cancelled_at = nowIso;

  const { error } = await supabase
    .from(WavonDbTable.invoices)
    .update(patch)
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) {
    console.error("[api/invoices/status] update error:", error);
    return NextResponse.json({ error: "Impossible de mettre à jour la facture." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

