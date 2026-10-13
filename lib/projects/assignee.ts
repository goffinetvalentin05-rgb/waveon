import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectMemberOption = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string;
};

export function memberLabel(member: {
  display_name?: string | null;
  email?: string | null;
}): string {
  return member.display_name?.trim() || member.email?.trim() || "Membre";
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

/** Liste les membres d’un projet (y compris owner fallback). */
export async function listProjectMembers(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectMemberOption[]> {
  const [{ data: members }, { data: project }] = await Promise.all([
    supabase
      .from("project_members")
      .select("user_id, display_name, email, role")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase.from("projects").select("user_id").eq("id", projectId).maybeSingle(),
  ]);

  const rows = (members ?? []) as ProjectMemberOption[];
  if (rows.length > 0) return rows;

  if (project?.user_id) {
    return [
      {
        user_id: project.user_id,
        display_name: "Owner",
        email: null,
        role: "owner",
      },
    ];
  }
  return [];
}

/** Vérifie qu’un user_id est membre autorisé du projet. */
export async function isProjectAssignee(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const members = await listProjectMembers(supabase, projectId);
  return members.some((m) => m.user_id === userId);
}

export async function resolveAssigneeName(
  supabase: SupabaseClient,
  projectId: string | null | undefined,
  assignedUserId: string | null | undefined
): Promise<{ id: string; name: string } | null> {
  if (!assignedUserId) return null;
  if (!projectId) {
    return { id: assignedUserId, name: "Membre" };
  }
  const members = await listProjectMembers(supabase, projectId);
  const match = members.find((m) => m.user_id === assignedUserId);
  if (!match) return { id: assignedUserId, name: "Membre" };
  return { id: assignedUserId, name: memberLabel(match) };
}
