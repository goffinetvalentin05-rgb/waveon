import { notFound } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjects } from "@/lib/projects/server";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { countProspectWork } from "@/lib/crm/counters";
import { getFollowUpState } from "@/lib/crm/follow-up-state";
import { prospectDetailHref } from "@/lib/crm/paths";
import {
  activityLabel,
  buildActivitySeries,
  pipelineStageCounts,
} from "@/lib/crm/dashboard";
import { formatRelativeDay } from "@/lib/crm/format";
import { migrateProspectStatus } from "@/lib/crm/status";
import { isDemoStatus } from "@/lib/crm/closed";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const projects = await fetchProjects(supabase, user.id, true);
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
  const since = threeMonthsAgo.toISOString();

  const [prospectsRes, tasksRes, calendarRes, activityRes] = await Promise.all([
    supabase
      .from("prospects")
      .select(
        "id, club_name, contact_name, status, next_follow_up, next_action, last_action, last_action_at, potential_value, created_at, demo_at"
      )
      .eq("user_id", user.id)
      .eq("project_id", id)
      .is("archived_at", null),
    supabase
      .from("daily_tasks")
      .select("id, title, due_date, status, priority, prospect_id")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .eq("scope", "project")
      .neq("status", "Terminé")
      .order("due_date", { ascending: true })
      .limit(20),
    supabase
      .from("calendar_events")
      .select("id, title, start_at, end_at")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .eq("scope", "project")
      .gte("end_at", `${today}T00:00:00`)
      .order("start_at", { ascending: true })
      .limit(12),
    supabase
      .from("workspace_events")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const prospects = prospectsRes.data ?? [];
  const work = countProspectWork(prospects, today);
  const prospectIds = prospects.map((p) => p.id);
  const potentialValue = prospects.reduce((s, p) => s + (Number(p.potential_value) || 0), 0);

  const { data: activities } =
    prospectIds.length > 0
      ? await supabase
          .from("prospect_activities")
          .select("id, prospect_id, action_type, title, created_at, occurred_at")
          .eq("user_id", user.id)
          .in("prospect_id", prospectIds)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(400)
      : { data: [] as { id: string; prospect_id: string; action_type: string; title: string | null; created_at: string; occurred_at: string | null }[] };

  const acts = activities ?? [];
  const series90 = buildActivitySeries(90, acts, prospects);
  const series30 = series90.slice(-30);
  const series7 = series90.slice(-7);

  const listReturn = `/projects/${id}/prospects`;
  const todayItems = [
    ...prospects
      .filter((p) => getFollowUpState({ status: p.status, next_follow_up: p.next_follow_up }, today).kind === "overdue")
      .slice(0, 6)
      .map((p) => ({
        id: `overdue-${p.id}`,
        href: prospectDetailHref(p.id, listReturn),
        title: p.club_name,
        meta: "Échéance dépassée",
        tone: "overdue" as const,
      })),
    ...prospects
      .filter((p) => getFollowUpState({ status: p.status, next_follow_up: p.next_follow_up }, today).kind === "today")
      .slice(0, 6)
      .map((p) => ({
        id: `follow-${p.id}`,
        href: prospectDetailHref(p.id, listReturn),
        title: p.club_name,
        meta: "À relancer aujourd’hui",
        tone: "today" as const,
      })),
    ...(calendarRes.data ?? [])
      .filter((e) => e.start_at.slice(0, 10) === today)
      .map((e) => ({
        id: `cal-${e.id}`,
        href: `/projects/${id}/calendar`,
        title: e.title,
        meta: "Rendez-vous",
        tone: "neutral" as const,
      })),
    ...(tasksRes.data ?? [])
      .filter((t) => t.due_date <= today)
      .slice(0, 6)
      .map((t) => ({
        id: `task-${t.id}`,
        href: `/projects/${id}/tasks`,
        title: t.title,
        meta: t.due_date < today ? "Tâche en retard" : "Tâche du jour",
        tone: (t.due_date < today ? "overdue" : "today") as "overdue" | "today",
      })),
    ...prospects
      .filter((p) => isDemoStatus(p.status) && p.demo_at?.slice(0, 10) === today)
      .map((p) => ({
        id: `demo-${p.id}`,
        href: prospectDetailHref(p.id, listReturn),
        title: p.club_name,
        meta: "Démo prévue",
        tone: "today" as const,
      })),
  ].slice(0, 10);

  const followUps = prospects
    .filter((p) => p.next_follow_up)
    .sort((a, b) => (a.next_follow_up ?? "").localeCompare(b.next_follow_up ?? ""))
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      href: prospectDetailHref(p.id, listReturn),
      name: p.club_name,
      status: migrateProspectStatus(p.status),
      when: formatRelativeDay(p.next_follow_up as string),
    }));

  const prospectName = new Map(prospects.map((p) => [p.id, p.club_name]));
  const recentFromProspects = acts.slice(0, 8).map((a) => ({
    id: a.id,
    href: prospectDetailHref(a.prospect_id, listReturn),
    title: `${activityLabel(a.action_type, a.title)}${prospectName.get(a.prospect_id) ? ` · ${prospectName.get(a.prospect_id)}` : ""}`,
    when: formatRelativeDay(a.occurred_at || a.created_at),
  }));
  const recent =
    recentFromProspects.length > 0
      ? recentFromProspects
      : (activityRes.data ?? []).map((item) => ({
          id: item.id,
          href: `/projects/${id}/activity`,
          title: item.title,
          when: formatRelativeDay(item.created_at),
        }));

  return (
    <ProjectDashboard
      projectId={id}
      enabledModules={project.enabledModules}
      kpis={{
        prospects: prospects.length,
        toContact: work.toContact,
        followUps: work.inRelance,
        meetings: work.demoScheduled,
        clients: work.clients,
        potentialValue,
      }}
      stages={pipelineStageCounts(prospects)}
      series7={series7}
      series30={series30}
      series90={series90}
      todayItems={todayItems}
      followUps={followUps}
      recent={recent}
    />
  );
}
