import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/finance/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if ("name" in body) {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    patch.name = name;
  }
  if ("amount" in body) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    patch.amount = amount;
  }
  if ("project_id" in body) patch.project_id = body.project_id || null;
  if ("currency" in body) patch.currency = body.currency || "CHF";
  if ("frequency" in body) {
    patch.frequency =
      body.frequency === "yearly" || body.frequency === "custom" ? body.frequency : "monthly";
  }
  if ("interval_days" in body) patch.interval_days = Number(body.interval_days) || null;
  if ("paid_by" in body) patch.paid_by = body.paid_by || null;
  if ("next_renewal" in body) patch.next_renewal = body.next_renewal || null;
  if ("category" in body && EXPENSE_CATEGORIES.includes(body.category as ExpenseCategory)) {
    patch.category = body.category;
  }
  if ("status" in body) patch.status = body.status === "cancelled" ? "cancelled" : "active";
  if ("notes" in body) patch.notes = String(body.notes ?? "").trim() || null;

  const { data, error } = await supabase
    .from("finance_subscriptions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ subscription: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const { error } = await supabase
    .from("finance_subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
