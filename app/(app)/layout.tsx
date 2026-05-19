import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { AppShell } from "@/components/app/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_color, is_admin, total_points")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.username) {
    redirect("/onboarding");
  }

  return (
    <AppShell
      profile={{
        id: profile.id,
        username: profile.username,
        avatarColor: profile.avatar_color ?? "indigo",
        isAdmin: Boolean(profile.is_admin),
        totalPoints: profile.total_points ?? 0,
        email: user.email ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
