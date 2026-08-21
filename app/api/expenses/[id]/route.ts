import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/finance/types";

type Params = { params: Promise<{ id: string }> };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if ("title" in body) {
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    patch.title = title;
  }
  if ("description" in body) patch.description = String(body.description ?? "").trim() || null;
  if ("amount" in body) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    patch.amount = amount;
  }
  if ("currency" in body) patch.currency = String(body.currency ?? "CHF") || "CHF";
  if ("project_id" in body) patch.project_id = body.project_id || null;
  if ("category" in body && EXPENSE_CATEGORIES.includes(body.category as ExpenseCategory)) {
    patch.category = body.category;
  }
  if ("paid_by" in body) patch.paid_by = body.paid_by || null;
  if ("split_method" in body) patch.split_method = body.split_method === "custom" ? "custom" : "equal";
  if ("expense_date" in body) patch.expense_date = body.expense_date;
  if ("receipt_url" in body) patch.receipt_url = String(body.receipt_url ?? "").trim() || null;
  if ("is_recurring" in body) patch.is_recurring = Boolean(body.is_recurring);
  if ("notes" in body) patch.notes = String(body.notes ?? "").trim() || null;

  const { data, error } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (Array.isArray(body.participant_ids) || Array.isArray(body.shares)) {
    await supabase.from("expense_shares").delete().eq("expense_id", id).eq("user_id", user.id);
    const amount = Number(data.amount);
    const splitMethod = data.split_method;
    const ids: string[] = Array.isArray(body.participant_ids)
      ? body.participant_ids.map((x: unknown) => String(x))
      : [];
    let shareRows: { user_id: string; expense_id: string; person_id: string; amount: number }[] = [];
    if (splitMethod === "custom" && Array.isArray(body.shares)) {
      shareRows = body.shares.map((s: { person_id: string; amount: number }) => ({
        user_id: user.id,
        expense_id: id,
        person_id: s.person_id,
        amount: round2(Number(s.amount) || 0),
      }));
    } else if (ids.length) {
      const base = round2(amount / ids.length);
      const remainder = round2(amount - base * ids.length);
      shareRows = ids.map((person_id, i) => ({
        user_id: user.id,
        expense_id: id,
        person_id,
        amount: i === 0 ? round2(base + remainder) : base,
      }));
    }
    if (shareRows.length) await supabase.from("expense_shares").insert(shareRows);
  }

  return NextResponse.json({ expense: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
