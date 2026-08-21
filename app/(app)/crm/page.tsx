import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjectSummaries } from "@/lib/projects/server";
import { ProjectCards } from "@/components/projects/ProjectCards";
import { ui } from "@/lib/design/tokens";

export default async function CrmIndexPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const projects = await fetchProjectSummaries(supabase, user.id);

  return (
    <div className="space-y-6">
      <div className="crm-animate-in">
        <h1 className={ui.h1}>Prospects</h1>
        <p className="mt-1 text-sm text-[#8a9e96]">Choisis un projet pour voir son pipeline.</p>
      </div>
      <div className="crm-animate-in-delay-1">
        <ProjectCards
          projects={projects}
          hrefFor={(id) =>
            id === "unassigned" ? "/crm/prospects?project=unassigned" : `/projects/${id}/prospects`
          }
        />
      </div>
    </div>
  );
}
