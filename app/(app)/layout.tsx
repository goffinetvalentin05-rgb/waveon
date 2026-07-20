import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { AppShell } from "@/components/app/AppShell";

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

  return (
    <AppShell
      profile={{
        id: user.id,
        email: user.email ?? null,
        displayName,
      }}
    >
      {children}
    </AppShell>
  );
}
