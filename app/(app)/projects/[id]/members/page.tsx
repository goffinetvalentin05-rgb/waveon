import { notFound } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjects } from "@/lib/projects/server";
import { MembersClient } from "@/components/projects/MembersClient";
import { can } from "@/lib/access/permissions";
import type { ProjectInvitationRow, ProjectMemberRow } from "@/lib/projects/members";
import { parseInviteRole, parseMemberRole } from "@/lib/projects/members";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectMembersPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const projects = await fetchProjects(supabase, user.id, true);
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  const role = project.myRole ?? (project.user_id === user.id ? "owner" : "viewer");
  if (!can(role, "members.view")) notFound();

  const [membersRes, invitesRes] = await Promise.all([
    supabase
      .from("project_members")
      .select("id, project_id, user_id, role, email, display_name, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_invitations")
      .select(
        "id, project_id, email, token, role, created_by, expires_at, accepted_at, revoked_at, created_at"
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const members: ProjectMemberRow[] = (membersRes.data ?? [])
    .map((row) => {
      const parsed = parseMemberRole(row.role);
      if (!parsed) return null;
      return { ...row, role: parsed };
    })
    .filter(Boolean) as ProjectMemberRow[];

  const fallbackOwner: ProjectMemberRow[] =
    members.length === 0
      ? [
          {
            id: "owner-fallback",
            project_id: id,
            user_id: project.user_id,
            role: "owner",
            email: project.user_id === user.id ? user.email ?? null : null,
            display_name: project.user_id === user.id ? "Vous" : "Owner",
            created_at: project.created_at,
          },
        ]
      : members;

  const invitations: ProjectInvitationRow[] = (invitesRes.data ?? [])
    .map((row) => {
      const parsed = parseInviteRole(row.role);
      if (!parsed) return null;
      return { ...row, role: parsed };
    })
    .filter(Boolean) as ProjectInvitationRow[];

  return (
    <MembersClient
      projectId={id}
      projectName={project.name}
      myRole={role}
      members={fallbackOwner}
      invitations={invitesRes.error ? [] : invitations}
    />
  );
}
