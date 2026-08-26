import { notFound } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjects } from "@/lib/projects/server";
import { ProjectActions } from "@/components/projects/ProjectActions";
import { ui } from "@/lib/design/tokens";
import { can } from "@/lib/access/permissions";

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
    <div className="space-y-5">
      <div className={`${ui.card} p-6`}>
        <p className={ui.kicker}>Projet</p>
        <h2 className={`${ui.h2} mt-2 text-lg`}>{project.name}</h2>
        {project.description ? <p className="mt-2 text-sm text-wo-muted">{project.description}</p> : null}
        <p className="mt-3 text-sm text-wo-secondary">
          Votre rôle : <span className="font-medium text-wo-text">{role}</span>
        </p>
        {can(role, "project.edit_settings") ? (
          <div className="mt-5">
            <ProjectActions project={project} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-wo-muted">Seuls l&apos;owner et les admins peuvent modifier ces paramètres.</p>
        )}
      </div>
    </div>
  );
}
