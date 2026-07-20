import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data: prospects, error } = await supabase
    .from("prospects")
    .select("id, status, created_at")
    .eq("user_id", user.id)
    .is("archived_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = prospects ?? [];
  const total = list.length;
  const clients = list.filter((p) => p.status === "Client").length;
  const demos = list.filter((p) => p.status === "Démonstration").length;
  const refus = list.filter((p) => p.status === "Refus").length;
  const conversionRate = total > 0 ? Math.round((clients / total) * 1000) / 10 : 0;

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("action_type, created_at")
    .eq("user_id", user.id);

  const acts = activities ?? [];
  const mails = acts.filter((a) => a.action_type === "mail_sent").length;
  const calls = acts.filter((a) => a.action_type === "call_made").length;
  const demosDone = acts.filter((a) => a.action_type === "demo_scheduled").length;

  // Distribution par statut
  const byStatus: Record<string, number> = {};
  for (const p of list) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  // Activité des 30 derniers jours
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
    clients,
    demos,
    refus,
    mails,
    calls,
    demosDone,
    conversionRate,
    byStatus,
    activityByDay: days,
  });
}
