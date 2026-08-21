import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "@/lib/projects/types";
import { CLOSED_STATUS_POSTGREST, isDemoScheduledStatus } from "@/lib/crm/closed";

export async function fetchProjects(
  supabase: SupabaseClient,
  userId: string,
  includeArchived = false
): Promise<Project[]> {
  let query = supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (!includeArchived) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as Project[];
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
        p.status !== "Client" &&
        p.status !== "Refusé"
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
      color: "#6a6578",
      status: "active",
      created_at: "",
      updated_at: "",
      prospectsCount: unassigned.length,
      followUpsToday: unassigned.filter(
        (p) =>
          p.next_follow_up &&
          p.next_follow_up <= today &&
          p.status !== "Client" &&
          p.status !== "Refusé"
      ).length,
      demosUpcoming: unassigned.filter((p) => isDemoScheduledStatus(p.status)).length,
      clientsCount: unassigned.filter((p) => p.status === "Client").length,
      potentialValue: unassigned.reduce((sum, p) => sum + (Number(p.potential_value) || 0), 0),
    });
  }

  return summaries;
}

export { CLOSED_STATUS_POSTGREST };
