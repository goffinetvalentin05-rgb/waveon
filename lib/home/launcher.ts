import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProjects } from "@/lib/projects/server";
import { hasModule } from "@/lib/projects/modules";
import type { Project } from "@/lib/projects/types";
import { CLOSED_STATUS_POSTGREST } from "@/lib/crm/closed";
import type { PersonalSecurityState } from "@/lib/personal/security";

export type LauncherProjectCard = Project & {
  openTasks: number;
  followUps: number;
  nextEventTitle: string | null;
  nextEventAt: string | null;
};

export type LauncherData = {
  personal: {
    lockEnabled: boolean;
    unlocked: boolean;
    openTasks: number;
    nextEventTitle: string | null;
    nextEventAt: string | null;
  };
  projects: LauncherProjectCard[];
  unassigned: {
    prospects: number;
    tasks: number;
    notes: number;
  };
};

export async function loadLauncherData(
  supabase: SupabaseClient,
  userId: string,
  security: PersonalSecurityState
): Promise<LauncherData> {
  const today = new Date().toISOString();
  const todayDate = today.slice(0, 10);
  const projects = await fetchProjects(supabase, userId, false);

  const [personalTasks, personalEvents, projectTasks, projectEvents, followUps, unassignedProspects, unassignedTasks, unassignedNotes] =
    await Promise.all([
      supabase
        .from("daily_tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("scope", "personal")
        .neq("status", "Terminé"),
      supabase
        .from("calendar_events")
        .select("title, start_at")
        .eq("user_id", userId)
        .eq("scope", "personal")
        .gte("end_at", today)
        .order("start_at", { ascending: true })
        .limit(1),
      supabase
        .from("daily_tasks")
        .select("id, project_id")
        .eq("user_id", userId)
        .eq("scope", "project")
        .neq("status", "Terminé"),
      supabase
        .from("calendar_events")
        .select("title, start_at, project_id")
        .eq("user_id", userId)
        .eq("scope", "project")
        .gte("end_at", today)
        .order("start_at", { ascending: true })
        .limit(80),
      supabase
        .from("prospects")
        .select("id, project_id")
        .eq("user_id", userId)
        .is("archived_at", null)
        .eq("next_follow_up", todayDate)
        .not("status", "in", CLOSED_STATUS_POSTGREST),
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("archived_at", null)
        .is("project_id", null),
      supabase
        .from("daily_tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("scope", "project")
        .is("project_id", null)
        .neq("status", "Terminé"),
      supabase
        .from("workspace_notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("scope", "project")
        .is("project_id", null),
    ]);

  const tasksByProject = new Map<string, number>();
  for (const row of projectTasks.data ?? []) {
    if (!row.project_id) continue;
    tasksByProject.set(row.project_id, (tasksByProject.get(row.project_id) ?? 0) + 1);
  }

  const followUpsByProject = new Map<string, number>();
  for (const row of followUps.data ?? []) {
    if (!row.project_id) continue;
    followUpsByProject.set(row.project_id, (followUpsByProject.get(row.project_id) ?? 0) + 1);
  }

  const nextEventByProject = new Map<string, { title: string; start_at: string }>();
  for (const row of projectEvents.data ?? []) {
    if (!row.project_id || nextEventByProject.has(row.project_id)) continue;
    nextEventByProject.set(row.project_id, { title: row.title, start_at: row.start_at });
  }

  const personalEvent = personalEvents.data?.[0] ?? null;

  return {
    personal: {
      lockEnabled: security.lockEnabled,
      unlocked: security.unlocked,
      openTasks: personalTasks.count ?? 0,
      nextEventTitle: personalEvent?.title ?? null,
      nextEventAt: personalEvent?.start_at ?? null,
    },
    projects: projects.map((project) => {
      const next = nextEventByProject.get(project.id);
      return {
        ...project,
        openTasks: hasModule(project.enabledModules, "tasks")
          ? (tasksByProject.get(project.id) ?? 0)
          : 0,
        followUps: hasModule(project.enabledModules, "prospects")
          ? (followUpsByProject.get(project.id) ?? 0)
          : 0,
        nextEventTitle: hasModule(project.enabledModules, "calendar")
          ? (next?.title ?? null)
          : null,
        nextEventAt: hasModule(project.enabledModules, "calendar")
          ? (next?.start_at ?? null)
          : null,
      };
    }),
    unassigned: {
      prospects: unassignedProspects.count ?? 0,
      tasks: unassignedTasks.count ?? 0,
      notes: unassignedNotes.count ?? 0,
    },
  };
}
