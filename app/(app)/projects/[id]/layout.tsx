import { notFound } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjects } from "@/lib/projects/server";
import { ProjectSwitcher } from "@/components/projects/ProjectSwitcher";
import { ProjectSubNav } from "@/components/projects/ProjectSubNav";
import { ProjectActions } from "@/components/projects/ProjectActions";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const projects = await fetchProjects(supabase, user.id, true);
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <ProjectSwitcher projects={projects} currentId={id} />
          <h1 className="mt-3 text-[1.65rem] font-semibold tracking-tight text-[#f3f0fa]">{project.name}</h1>
          {project.description ? (
            <p className="mt-1 text-sm text-[#8b869c]">{project.description}</p>
          ) : null}
        </div>
        <ProjectActions project={project} />
      </div>
      <ProjectSubNav projectId={id} />
      {children}
    </div>
  );
}
