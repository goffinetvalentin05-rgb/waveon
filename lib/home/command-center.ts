import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProjects } from "@/lib/projects/server";
import { hasModule } from "@/lib/projects/modules";
import { CLOSED_STATUS_POSTGREST } from "@/lib/crm/closed";
import type { Project } from "@/lib/projects/types";
import type { PersonalSecurityState } from "@/lib/personal/security";

export type CommandCenterTask = {
  id: string;
  title: string;
  due_date: string;
  status: string;
  scope: string;
  project_id: string | null;
  projectName: string | null;
};

export type CommandCenterEvent = {
  id: string;
  title: string;
  start_at: string;
  scope: string;
  project_id: string | null;
};

export type CommandCenterActivity = {
  id: string;
  title: string;
  created_at: string;
  project_id: string | null;
};

export type CommandCenterProject = Project & {
  openTasks: number;
  followUps: number;
};

export type CommandCenterData = {
  todayTasks: CommandCenterTask[];
  overdueTasks: CommandCenterTask[];
  todayEvents: CommandCenterEvent[];
  followUpsDue: number;
  recentActivity: CommandCenterActivity[];
  projects: CommandCenterProject[];
  personal: {
    lockEnabled: boolean;
    unlocked: boolean;
    openTasks: number;
  };
};

export async function loadCommandCenter(
  supabase: SupabaseClient,
  userId: string,
  security: PersonalSecurityState
): Promise<CommandCenterData> {
  const today = new Date().toISOString().slice(0, 10);
  const dayEnd = `${today}T23:59:59.999Z`;
  const projects = await fetchProjects(supabase, userId, false);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  const [tasksRes, overdueRes, eventsRes, followUpsRes, activityRes, personalTasksRes, projectTasksRes] =
    await Promise.all([
      supabase
        .from("daily_tasks")
        .select("id, title, due_date, status, scope, project_id")
        .eq("user_id", userId)
        .eq("due_date", today)
        .neq("status", "Terminé")
        .order("created_at", { ascending: true })
        .limit(8),
      supabase
        .from("daily_tasks")
        .select("id, title, due_date, status, scope, project_id")
        .eq("user_id", userId)
        .lt("due_date", today)
        .neq("status", "Terminé")
        .order("due_date", { ascending: true })
        .limit(6),
      supabase
        .from("calendar_events")
        .select("id, title, start_at, scope, project_id")
        .eq("user_id", userId)
        .gte("end_at", `${today}T00:00:00.000Z`)
        .lte("start_at", dayEnd)
        .order("start_at", { ascending: true })
        .limit(6),
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("archived_at", null)
        .lte("next_follow_up", today)
        .not("status", "in", CLOSED_STATUS_POSTGREST),
      supabase
        .from("workspace_events")
        .select("id, title, created_at, project_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("daily_tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("scope", "personal")
        .neq("status", "Terminé"),
      supabase
        .from("daily_tasks")
        .select("id, project_id")
        .eq("user_id", userId)
        .eq("scope", "project")
        .neq("status", "Terminé"),
    ]);

  const mapTask = (row: {
    id: string;
    title: string;
    due_date: string;
    status: string;
    scope: string;
    project_id: string | null;
  }): CommandCenterTask => ({
    ...row,
    projectName: row.project_id ? projectName.get(row.project_id) ?? null : null,
  });

  const tasksByProject = new Map<string, number>();
  for (const row of projectTasksRes.data ?? []) {
    if (!row.project_id) continue;
    tasksByProject.set(row.project_id, (tasksByProject.get(row.project_id) ?? 0) + 1);
  }

  const followUpsByProject = new Map<string, number>();
  const followList = await supabase
    .from("prospects")
    .select("id, project_id")
    .eq("user_id", userId)
    .is("archived_at", null)
    .eq("next_follow_up", today)
    .not("status", "in", CLOSED_STATUS_POSTGREST);
  for (const row of followList.data ?? []) {
    if (!row.project_id) continue;
    followUpsByProject.set(row.project_id, (followUpsByProject.get(row.project_id) ?? 0) + 1);
  }

  return {
    todayTasks: (tasksRes.data ?? []).map(mapTask),
    overdueTasks: (overdueRes.data ?? []).map(mapTask),
    todayEvents: (eventsRes.data ?? []) as CommandCenterEvent[],
    followUpsDue: followUpsRes.count ?? 0,
    recentActivity: (activityRes.data ?? []) as CommandCenterActivity[],
    projects: projects.map((project) => ({
      ...project,
      openTasks: hasModule(project.enabledModules, "tasks") ? (tasksByProject.get(project.id) ?? 0) : 0,
      followUps: hasModule(project.enabledModules, "prospects")
        ? (followUpsByProject.get(project.id) ?? 0)
        : 0,
    })),
    personal: {
      lockEnabled: security.lockEnabled,
      unlocked: security.unlocked,
      openTasks: personalTasksRes.count ?? 0,
    },
  };
}
