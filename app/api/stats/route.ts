import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

function rate(num: number, den: number) {
  return den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const projectId = new URL(request.url).searchParams.get("project");

  let query = supabase
    .from("prospects")
    .select("id, status, created_at, potential_value")
    .eq("user_id", user.id)
    .is("archived_at", null);

  if (projectId) query = query.eq("project_id", projectId);

  const { data: prospects, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = prospects ?? [];
  const total = list.length;
  const clients = list.filter((p) => p.status === "Client").length;
  const contacted = list.filter((p) => p.status !== "À contacter").length;
  const replies = list.filter((p) =>
    ["Répondu", "Démo prévue", "Démo faite", "Négociation", "Client"].includes(p.status)
  ).length;
  const demos = list.filter((p) =>
    ["Démo prévue", "Démo faite", "Négociation", "Client", "Démonstration"].includes(p.status)
  ).length;
  const refus = list.filter((p) => p.status === "Refusé" || p.status === "Refus").length;
  const potentialValue = list.reduce((s, p) => s + (Number(p.potential_value) || 0), 0);
  const wonValue = list
    .filter((p) => p.status === "Client")
    .reduce((s, p) => s + (Number(p.potential_value) || 0), 0);

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("action_type, created_at")
    .eq("user_id", user.id);

  const acts = activities ?? [];
  const mails = acts.filter((a) => a.action_type === "mail_sent" || a.action_type === "email").length;
  const calls = acts.filter((a) => a.action_type === "call_made" || a.action_type === "call").length;
  const demosDone = acts.filter(
    (a) => a.action_type === "demo_scheduled" || a.action_type === "demo"
  ).length;

  const byStatus: Record<string, number> = {};
  for (const p of list) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  const days: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: 0 });
  }
  const dayMap = new Map(days.map((d) => [d.date, d]));
  for (const a of acts) {
    const key = a.created_at.slice(0, 10);
    const bucket = dayMap.get(key);
    if (bucket) bucket.count += 1;
  }

  return NextResponse.json({
    total,
    contacted,
    replies,
    demos,
    clients,
    refus,
    mails,
    calls,
    demosDone,
    potentialValue,
    wonValue,
    replyRate: rate(replies, contacted),
    contactToDemoRate: rate(demos, contacted),
    demoToClientRate: rate(clients, demos),
    conversionRate: rate(clients, total),
    byStatus,
    activityByDay: days,
  });
}
