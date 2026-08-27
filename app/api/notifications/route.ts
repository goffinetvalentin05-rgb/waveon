import { addDays, addMinutes, format } from "date-fns";
import { fr } from "date-fns/locale";
import { NextResponse } from "next/server";
import { requireUser, todayISO } from "@/lib/crm/server";
import { CLOSED_STATUS_POSTGREST } from "@/lib/crm/closed";
import type { AppNotification } from "@/lib/workspace/notifications";
import { fetchProjects } from "@/lib/projects/server";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const today = todayISO();
  const now = new Date();
  const soon = addMinutes(now, 60).toISOString();
  const tomorrow = addDays(new Date(`${today}T12:00:00`), 1).toISOString().slice(0, 10);
  const inThreeDays = addDays(new Date(`${today}T12:00:00`), 3).toISOString().slice(0, 10);
  const projects = await fetchProjects(supabase, user.id, true);
  const projectName = (id: string | null | undefined) =>
    (id && projects.find((p) => p.id === id)?.name) || "Sans projet";

  const [followUps, overdueTasks, renewals, demos, upcomingEvents] = await Promise.all([
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
      .select("id, title, due_date, project_id, scope")
      .eq("user_id", user.id)
      .lt("due_date", today)
      .neq("status", "Terminé")
      .limit(40),
    supabase
      .from("finance_subscriptions")
      .select("id, name, next_renewal, project_id")
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
      .in("status", ["Démo", "Démo prévue", "Démonstration"])
      .gte("next_follow_up", today)
      .lte("next_follow_up", tomorrow)
      .limit(20),
    supabase
      .from("calendar_events")
      .select("id, title, start_at, project_id, scope")
      .eq("user_id", user.id)
      .gte("start_at", now.toISOString())
      .lte("start_at", soon)
      .limit(10),
  ]);

  const items: AppNotification[] = [];

  const followUpRows = followUps.data ?? [];
  const byProject = new Map<string, typeof followUpRows>();
  for (const p of followUpRows) {
    const key = p.project_id ?? "unassigned";
    const list = byProject.get(key) ?? [];
    list.push(p);
    byProject.set(key, list);
  }
  for (const [key, rows] of byProject) {
    const ctx = key === "unassigned" ? "Sans projet" : projectName(key);
    const href = key === "unassigned" ? "/projects" : `/projects/${key}/prospects`;
    items.push({
      id: `fu-${key}`,
      kind: "follow_up",
      title:
        rows.length === 1
          ? `${rows[0].club_name} doit être relancé aujourd'hui.`
          : `${rows.length} prospects à relancer`,
      href,
      tone: "warning",
      context: ctx,
    });
  }

  const overdue = overdueTasks.data ?? [];
  const overdueGroups = new Map<string, typeof overdue>();
  for (const t of overdue) {
    const key = t.scope === "personal" ? "personal" : t.project_id ?? "unassigned";
    const list = overdueGroups.get(key) ?? [];
    list.push(t);
    overdueGroups.set(key, list);
  }
  for (const [key, rows] of overdueGroups) {
    const personal = key === "personal";
    items.push({
      id: `ot-${key}`,
      kind: "overdue_task",
      title: rows.length === 1 ? `Tâche en retard : ${rows[0].title}` : `${rows.length} tâches en retard`,
      href: personal ? "/personal/tasks?view=overdue" : key === "unassigned" ? "/projects" : `/projects/${key}/tasks`,
      tone: "danger",
      context: personal ? "Personnel" : key === "unassigned" ? "Sans projet" : projectName(key),
    });
  }

  for (const s of renewals.data ?? []) {
    items.push({
      id: `rn-${s.id}`,
      kind: "renewal",
      title: `Abonnement ${s.name} se renouvelle bientôt.`,
      href: s.project_id ? `/projects/${s.project_id}/finances` : "/projects",
      tone: "warning",
      context: projectName(s.project_id),
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
      context: projectName(p.project_id),
    });
  }

  for (const e of upcomingEvents.data ?? []) {
    const at = format(new Date(e.start_at), "HH:mm", { locale: fr });
    items.push({
      id: `ev-${e.id}`,
      kind: "upcoming_event",
      title: `Rendez-vous à ${at} : ${e.title}`,
      href: e.scope === "personal" ? "/personal/calendar" : e.project_id ? `/projects/${e.project_id}/calendar` : "/projects",
      tone: "warning",
      context: e.scope === "personal" ? "Personnel" : projectName(e.project_id),
    });
  }

  return NextResponse.json({ notifications: items, count: items.length });
}
