import { notFound, redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjects } from "@/lib/projects/server";
import { hasModule, type ProjectModuleKey } from "@/lib/projects/modules";

export async function requireProjectModule(projectId: string, module: ProjectModuleKey) {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const projects = await fetchProjects(supabase, user.id, true);
  const project = projects.find((p) => p.id === projectId);
  if (!project) notFound();
  if (!hasModule(project.enabledModules, module)) {
    redirect(`/projects/${projectId}`);
  }
}
