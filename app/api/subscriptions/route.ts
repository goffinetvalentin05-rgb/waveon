import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/finance/types";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const projectId = new URL(request.url).searchParams.get("project");

  let query = supabase
    .from("finance_subscriptions")
    .select("*, project:projects(id, name, color), payer:people!finance_subscriptions_paid_by_fkey(id, name)")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) {
    const fallback = await supabase
      .from("finance_subscriptions")
      .select("*")
      .eq("user_id", user.id);
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    return NextResponse.json({ subscriptions: fallback.data ?? [] });
  }
  return NextResponse.json({ subscriptions: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const amount = Number(body.amount);
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const frequency =
    body.frequency === "yearly" || body.frequency === "custom" ? body.frequency : "monthly";
  const category = EXPENSE_CATEGORIES.includes(body.category as ExpenseCategory)
    ? (body.category as ExpenseCategory)
    : "SaaS";

  const { data, error } = await supabase
    .from("finance_subscriptions")
    .insert({
      user_id: user.id,
      name,
      project_id: body.project_id || null,
      amount,
      currency: String(body.currency ?? "CHF") || "CHF",
      frequency,
      interval_days: frequency === "custom" ? Number(body.interval_days) || 30 : null,
      paid_by: body.paid_by || null,
      next_renewal: body.next_renewal || null,
      category,
      status: body.status === "cancelled" ? "cancelled" : "active",
      notes: String(body.notes ?? "").trim() || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscription: data }, { status: 201 });
}
