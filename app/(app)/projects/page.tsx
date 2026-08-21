import { Suspense } from "react";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjects } from "@/lib/projects/server";
import { getPersonalSecurityState } from "@/lib/personal/security";
import { loadLauncherData } from "@/lib/home/launcher";
import { ProjectsHub } from "@/components/projects/ProjectsHub";

export default async function ProjectsPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const security = await getPersonalSecurityState(supabase, user.id);
  const [all, launcher] = await Promise.all([
    fetchProjects(supabase, user.id, true),
    loadLauncherData(supabase, user.id, security),
  ]);

  return (
    <Suspense fallback={<p className="text-sm text-[#6a6578]">Chargement…</p>}>
      <ProjectsHub
        projects={launcher.projects}
        archived={all.filter((p) => p.status === "archived")}
        unassigned={launcher.unassigned}
      />
    </Suspense>
  );
}
