import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { AppShell } from "@/components/app/AppShell";
import { fetchProjects } from "@/lib/projects/server";
import { getPersonalSecurityState } from "@/lib/personal/security";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Utilisateur";

  const projects = await fetchProjects(supabase, user.id, true);
  const personal = await getPersonalSecurityState(supabase, user.id);

  return (
    <AppShell
      profile={{
        id: user.id,
        email: user.email ?? null,
        displayName,
      }}
      projects={projects}
      personalLockEnabled={personal.lockEnabled}
      personalUnlocked={personal.unlocked}
    >
      {children}
    </AppShell>
  );
}
