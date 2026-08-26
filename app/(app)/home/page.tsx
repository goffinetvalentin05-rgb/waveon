import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { firstNameFromDisplay } from "@/lib/brand/config";
import { fetchProjects } from "@/lib/projects/server";
import { getPersonalSecurityState } from "@/lib/personal/security";
import { HomeEntry } from "@/components/home/HomeEntry";

export default async function HomePage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "toi";

  const [projects, security] = await Promise.all([
    fetchProjects(supabase, user.id, false),
    getPersonalSecurityState(supabase, user.id),
  ]);

  return (
    <HomeEntry
      firstName={firstNameFromDisplay(displayName)}
      projects={projects}
      personalLocked={security.lockEnabled}
    />
  );
}
