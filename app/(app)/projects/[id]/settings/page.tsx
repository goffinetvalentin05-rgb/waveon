import Link from "next/link";
import { notFound } from "next/navigation";
import { IconChevronRight, IconUsersGroup } from "@tabler/icons-react";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjects } from "@/lib/projects/server";
import { ProjectActions, ProjectDangerZone } from "@/components/projects/ProjectActions";
import { ProjectCalendarSyncCard } from "@/components/projects/ProjectCalendarSyncCard";
import { ui } from "@/lib/design/tokens";
import { can } from "@/lib/access/permissions";
import { PROJECT_ROLE_LABELS } from "@/lib/access/roles";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectSettingsPage({ params }: Props) {
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

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <p className={ui.kicker}>Projet</p>
          <h2 className={`${ui.h2} mt-1`}>{project.name}</h2>
        </div>
        <div className={`${ui.card} p-6`}>
          {project.description ? <p className="text-sm text-wo-muted">{project.description}</p> : null}
          <p className={`${project.description ? "mt-3" : ""} text-sm text-wo-secondary`}>
            Votre rôle :{" "}
            <span className="font-medium text-wo-text">{PROJECT_ROLE_LABELS[role] ?? role}</span>
          </p>
          {can(role, "project.edit_settings") ? (
            <div className="mt-5">
              <ProjectActions project={project} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-wo-muted">
              Seuls l&apos;owner et les admins peuvent modifier ces paramètres.
            </p>
          )}
        </div>
      </section>

      {can(role, "members.view") ? (
        <section className="space-y-3">
          <p className={ui.kicker}>Membres</p>
          <Link href={`/projects/${project.id}/members`} className={`${ui.cardInteractive} flex items-center gap-4 p-6`}>
            <span className={ui.tile}>
              <IconUsersGroup className="h-[18px] w-[18px]" stroke={1.7} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`${ui.h2} block`}>Équipe du projet</span>
              <span className="mt-1 block text-sm text-wo-muted">
                Inviter des collaborateurs, gérer les rôles et le code de partage.
              </span>
            </span>
            <IconChevronRight className="h-4 w-4 shrink-0 text-wo-dim" />
          </Link>
        </section>
      ) : null}

      <ProjectCalendarSyncCard projectId={project.id} role={role} />
      <ProjectDangerZone project={project} role={role} currentUserId={user.id} />
    </div>
  );
}
