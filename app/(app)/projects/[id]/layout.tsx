import { notFound } from "next/navigation";
import Link from "next/link";
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/projects" className="text-xs font-medium text-[#8b869c] hover:text-[#f3f0fa]">
            ← Tous les projets
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <ProjectSwitcher projects={projects} currentId={id} />
            {project.status === "archived" ? (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#8b869c]">Archivé</span>
            ) : null}
          </div>
          {project.description ? (
            <p className="mt-2 text-sm text-[#8b869c]">{project.description}</p>
          ) : null}
        </div>
        <ProjectActions project={project} />
      </div>
      <div className="lg:hidden">
        <ProjectSubNav projectId={id} enabledModules={project.enabledModules} />
      </div>
      {children}
    </div>
  );
}
