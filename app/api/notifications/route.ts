import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { requireUser, todayISO } from "@/lib/crm/server";
import { CLOSED_STATUS_POSTGREST } from "@/lib/crm/closed";
import type { AppNotification } from "@/lib/workspace/notifications";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const today = todayISO();
  const tomorrow = addDays(new Date(`${today}T12:00:00`), 1).toISOString().slice(0, 10);
  const inThreeDays = addDays(new Date(`${today}T12:00:00`), 3).toISOString().slice(0, 10);

  const [followUps, overdueTasks, renewals, demos] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, club_name, next_follow_up, project_id")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .eq("next_follow_up", today)
      .not("status", "in", CLOSED_STATUS_POSTGREST)
      .limit(20),
    supabase
      .from("daily_tasks")
      .select("id, title, due_date")
      .eq("user_id", user.id)
      .lt("due_date", today)
      .neq("status", "Terminé")
      .limit(20),
    supabase
      .from("finance_subscriptions")
      .select("id, name, next_renewal")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("next_renewal", today)
      .lte("next_renewal", inThreeDays)
      .limit(20),
    supabase
      .from("prospects")
      .select("id, club_name, next_follow_up, status, project_id")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .in("status", ["Démo prévue", "Démonstration"])
      .gte("next_follow_up", today)
      .lte("next_follow_up", tomorrow)
      .limit(20),
  ]);

  const items: AppNotification[] = [];

  for (const p of followUps.data ?? []) {
    items.push({
      id: `fu-${p.id}`,
      kind: "follow_up",
      title: `${p.club_name} doit être relancé aujourd'hui.`,
      href: `/crm/prospects/${p.id}`,
      tone: "warning",
    });
  }

  const overdue = overdueTasks.data ?? [];
  if (overdue.length === 1) {
    items.push({
      id: `ot-${overdue[0].id}`,
      kind: "overdue_task",
      title: `Tâche en retard : ${overdue[0].title}`,
      href: "/tasks?view=overdue",
      tone: "danger",
    });
  } else if (overdue.length > 1) {
    items.push({
      id: "ot-many",
      kind: "overdue_task",
      title: `${overdue.length} tâches sont en retard.`,
      href: "/tasks?view=overdue",
      tone: "danger",
    });
  }

  for (const s of renewals.data ?? []) {
    items.push({
      id: `rn-${s.id}`,
      kind: "renewal",
      title: `Abonnement ${s.name} se renouvelle bientôt.`,
      href: "/finances/subscriptions",
      tone: "warning",
    });
  }

  for (const p of demos.data ?? []) {
    const when = p.next_follow_up === today ? "aujourd'hui" : "demain";
    items.push({
      id: `dm-${p.id}`,
      kind: "demo",
      title: `Une démo est prévue ${when} : ${p.club_name}.`,
      href: `/crm/prospects/${p.id}`,
      tone: "default",
    });
  }

  return NextResponse.json({ notifications: items, count: items.length });
}
