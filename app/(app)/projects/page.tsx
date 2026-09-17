import { Suspense } from "react";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjects, fetchProjectSummaries } from "@/lib/projects/server";
import { getPersonalSecurityState } from "@/lib/personal/security";
import { loadLauncherData } from "@/lib/home/launcher";
import { ProjectsHub } from "@/components/projects/ProjectsHub";
import { ProjectsPicker } from "@/components/projects/ProjectsPicker";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ manage?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (sp.manage === "1" || sp.filter === "archived") {
    const security = await getPersonalSecurityState(supabase, user.id);
    const [all, launcher] = await Promise.all([
      fetchProjects(supabase, user.id, true),
      loadLauncherData(supabase, user.id, security),
    ]);

    return (
      <Suspense fallback={<p className="text-sm text-wo-dim">Chargement…</p>}>
        <ProjectsHub
          projects={launcher.projects}
          archived={all.filter((p) => p.status === "archived")}
          unassigned={launcher.unassigned}
        />
      </Suspense>
    );
  }

  const summaries = await fetchProjectSummaries(supabase, user.id);
  const unassigned = summaries.find((p) => p.id === "unassigned");

  return (
    <ProjectsPicker
      projects={summaries}
      unassignedCount={unassigned?.prospectsCount ?? 0}
    />
  );
}
