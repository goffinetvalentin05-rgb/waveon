import { createServerComponentSupabase } from "@/lib/supabase/server-component";

export type AppShellProfile = {
  username: string | null;
  email: string | null;
  isAdmin: boolean;
};

/** Profil minimal pour PronoClashShell sur les pages secondaires. */
export async function fetchAppShellProfile(): Promise<AppShellProfile> {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { username: null, email: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    username: profile?.username ?? null,
    email: user.email ?? null,
    isAdmin: Boolean(profile?.is_admin),
  };
}
