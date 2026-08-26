import type { SupabaseClient } from "@supabase/supabase-js";
import { can, type ProjectPermission } from "@/lib/access/permissions";
import { isProjectRole, type ProjectRole } from "@/lib/access/roles";
import type { Project } from "@/lib/projects/types";

export type ProjectAccess = {
  project: Project;
  role: ProjectRole;
};

export async function getMemberRole(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<ProjectRole | null> {
  const { data, error } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data && isProjectRole(data.role)) return data.role;

  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (project?.user_id === userId) return "owner";
  return null;
}

export async function requireProjectPermission(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  permission: ProjectPermission
): Promise<{ role: ProjectRole } | { error: string; status: number }> {
  const role = await getMemberRole(supabase, projectId, userId);
  if (!role) return { error: "Projet introuvable", status: 404 };
  if (!can(role, permission)) {
    return { error: "Permissions insuffisantes", status: 403 };
  }
  return { role };
}
