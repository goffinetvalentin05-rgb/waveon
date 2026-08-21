import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/finance/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const projectId = new URL(request.url).searchParams.get("project");

  let query = supabase
    .from("expenses")
    .select("*, payer:people!expenses_paid_by_fkey(id, name), project:projects(id, name, color), shares:expense_shares(*, person:people(id, name))")
    .eq("user_id", user.id)
    .order("expense_date", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) {
    const fallback = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false });
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    return NextResponse.json({ expenses: fallback.data ?? [] });
  }
  return NextResponse.json({ expenses: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const amount = Number(body.amount);
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const category = EXPENSE_CATEGORIES.includes(body.category as ExpenseCategory)
    ? (body.category as ExpenseCategory)
    : "Autre";
  const splitMethod = body.split_method === "custom" ? "custom" : "equal";
  const participantIds: string[] = Array.isArray(body.participant_ids)
    ? body.participant_ids.map((id: unknown) => String(id)).filter(Boolean)
    : [];

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      title,
      description: String(body.description ?? "").trim() || null,
      amount,
      currency: String(body.currency ?? "CHF").trim() || "CHF",
      project_id: body.project_id || null,
      category,
      paid_by: body.paid_by || null,
      split_method: splitMethod,
      expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
      receipt_url: String(body.receipt_url ?? "").trim() || null,
      is_recurring: Boolean(body.is_recurring),
      notes: String(body.notes ?? "").trim() || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = participantIds.length ? participantIds : body.paid_by ? [String(body.paid_by)] : [];
  const customShares: { person_id: string; amount: number }[] = Array.isArray(body.shares)
    ? body.shares
    : [];

  let shareRows: { user_id: string; expense_id: string; person_id: string; amount: number }[] = [];
  if (splitMethod === "custom" && customShares.length) {
    shareRows = customShares.map((s) => ({
      user_id: user.id,
      expense_id: expense.id,
      person_id: s.person_id,
      amount: round2(Number(s.amount) || 0),
    }));
  } else if (ids.length) {
    const base = round2(amount / ids.length);
    const remainder = round2(amount - base * ids.length);
    shareRows = ids.map((person_id, i) => ({
      user_id: user.id,
      expense_id: expense.id,
      person_id,
      amount: i === 0 ? round2(base + remainder) : base,
    }));
  }

  if (shareRows.length) {
    await supabase.from("expense_shares").insert(shareRows);
  }

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "expense_created",
    title: `Dépense : ${title}`,
    project_id: body.project_id || null,
    entity_type: "expense",
    entity_id: expense.id,
  });

  return NextResponse.json({ expense }, { status: 201 });
}
