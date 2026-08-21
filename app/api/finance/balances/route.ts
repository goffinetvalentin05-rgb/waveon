import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { computeBalances, loadFinanceGraph } from "@/lib/finance/balances";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const graph = await loadFinanceGraph(supabase, user.id);
  const { balances, details } = computeBalances(graph.expenses, graph.settlements, graph.people);
  return NextResponse.json({
    balances,
    details,
    settlements: graph.settlements,
    people: graph.people,
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const fromId = String(body.from_person_id ?? "");
  const toId = String(body.to_person_id ?? "");
  const amount = Number(body.amount);
  if (!fromId || !toId || fromId === toId) {
    return NextResponse.json({ error: "Personnes invalides" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("finance_settlements")
    .insert({
      user_id: user.id,
      from_person_id: fromId,
      to_person_id: toId,
      amount,
      currency: String(body.currency ?? "CHF") || "CHF",
      notes: String(body.notes ?? "").trim() || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settlement: data }, { status: 201 });
}
