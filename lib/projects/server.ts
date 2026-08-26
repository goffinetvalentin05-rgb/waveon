import type { SupabaseClient } from "@supabase/supabase-js";
import { isProjectRole } from "@/lib/access/roles";
import type { Project } from "@/lib/projects/types";
import { isClosedProspectStatus, isDemoScheduledStatus } from "@/lib/crm/closed";
import {
  DEFAULT_ENABLED_MODULES,
  SELECTABLE_MODULE_KEYS,
  modulesFromRows,
  normalizeModules,
  type ProjectModuleKey,
} from "@/lib/projects/modules";

type ProjectRow = Project & {
  project_modules?: { module: string; enabled: boolean }[] | null;
};

function mapProject(row: ProjectRow): Project {
  const { project_modules, ...project } = row;
  return {
    ...project,
    enabledModules: modulesFromRows(project_modules),
  };
}

async function fetchOwnedProjects(
  supabase: SupabaseClient,
  userId: string,
  includeArchived: boolean
): Promise<Project[]> {
  let query = supabase
    .from("projects")
    .select("*, project_modules(module, enabled)")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (!includeArchived) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) {
    let fallback = supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    if (!includeArchived) fallback = fallback.eq("status", "active");
    const retry = await fallback;
    if (retry.error) return [];
    return ((retry.data ?? []) as Project[]).map((p) => ({
      ...p,
      enabledModules: [...DEFAULT_ENABLED_MODULES],
      myRole: "owner" as const,
    }));
  }
  return ((data ?? []) as ProjectRow[]).map((row) => ({
    ...mapProject(row),
    myRole: "owner" as const,
  }));
}

export async function fetchProjects(
  supabase: SupabaseClient,
  userId: string,
  includeArchived = false
): Promise<Project[]> {
  const owned = await fetchOwnedProjects(supabase, userId, includeArchived);
  const byId = new Map(owned.map((p) => [p.id, p]));

  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("role, project:projects(*, project_modules(module, enabled))")
    .eq("user_id", userId);

  if (!error && memberships) {
    for (const row of memberships as {
      role: string;
      project: ProjectRow | ProjectRow[] | null;
    }[]) {
      const raw = Array.isArray(row.project) ? row.project[0] : row.project;
      if (!raw) continue;
      if (!includeArchived && raw.status === "archived") continue;
      const mapped = mapProject(raw);
      const role = isProjectRole(row.role)
        ? row.role
        : mapped.user_id === userId
          ? "owner"
          : "member";
      const existing = byId.get(mapped.id);
      byId.set(mapped.id, { ...(existing ?? mapped), ...mapped, myRole: role });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function replaceProjectModules(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  modules: ProjectModuleKey[]
): Promise<ProjectModuleKey[]> {
  const enabled = normalizeModules(modules);
  const enabledSet = new Set(enabled);
  const rows = SELECTABLE_MODULE_KEYS.map((module) => ({
    user_id: userId,
    project_id: projectId,
    module,
    enabled: module === "overview" || enabledSet.has(module),
  }));

  const { error } = await supabase.from("project_modules").upsert(rows, {
    onConflict: "project_id,module",
  });
  if (error) {
    throw new Error(error.message);
  }
  return enabled;
}

export async function fetchProjectSummaries(supabase: SupabaseClient, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [projects, prospectsRes] = await Promise.all([
    fetchProjects(supabase, userId, true),
    supabase
      .from("prospects")
      .select("id, project_id, status, next_follow_up, demo_at, potential_value")
      .eq("user_id", userId)
      .is("archived_at", null),
  ]);

  const prospects = prospectsRes.error ? [] : (prospectsRes.data ?? []);

  const unassigned = prospects.filter((p) => !p.project_id);
  const summaries = projects.map((project) => {
    const rows = prospects.filter((p) => p.project_id === project.id);
    const followUpsToday = rows.filter(
      (p) =>
        p.next_follow_up &&
        p.next_follow_up <= today &&
        !isClosedProspectStatus(p.status)
    ).length;
    const demosUpcoming = rows.filter((p) => isDemoScheduledStatus(p.status)).length;
    const clientsCount = rows.filter((p) => p.status === "Client").length;
    const potentialValue = rows.reduce((sum, p) => sum + (Number(p.potential_value) || 0), 0);
    return {
      ...project,
      prospectsCount: rows.length,
      followUpsToday,
      demosUpcoming,
      clientsCount,
      potentialValue,
    };
  });

  if (unassigned.length) {
    summaries.unshift({
      id: "unassigned",
      user_id: userId,
      name: "Sans projet",
      description: "Prospects à rattacher",
      icon: "•",
      color: "#6b7d76",
      status: "active",
      created_at: "",
      updated_at: "",
      prospectsCount: unassigned.length,
      followUpsToday: unassigned.filter(
        (p) =>
          p.next_follow_up &&
          p.next_follow_up <= today &&
          !isClosedProspectStatus(p.status)
      ).length,
      demosUpcoming: unassigned.filter((p) => isDemoScheduledStatus(p.status)).length,
      clientsCount: unassigned.filter((p) => p.status === "Client").length,
      potentialValue: unassigned.reduce((sum, p) => sum + (Number(p.potential_value) || 0), 0),
    });
  }

  return summaries;
}
