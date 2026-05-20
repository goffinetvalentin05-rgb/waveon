import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchAppShellProfile } from "@/lib/pronoclash/app-shell-profile";
import { GlobalLeagueClient } from "./GlobalLeagueClient";

export default async function GlobalLeaguePage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const shell = await fetchAppShellProfile();

  const [totalUsersRes, totalPredictionsRes, contestSettingsRes, myPredCountRes] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .is("league_id", null),
      supabase
        .from("contest_settings")
        .select("ends_at, is_active")
        .limit(1)
        .maybeSingle(),
      user
        ? supabase
            .from("predictions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("league_id", null)
        : Promise.resolve({ count: 0 }),
    ]);

  const cs = contestSettingsRes.data as
    | { ends_at: string | null; is_active: boolean }
    | null;

  return (
    <GlobalLeagueClient
      username={shell.username}
      email={shell.email}
      isAdmin={shell.isAdmin}
      totalUsers={totalUsersRes.count ?? 0}
      totalPredictions={totalPredictionsRes.count ?? 0}
      myPredictions={myPredCountRes.count ?? 0}
      contest={{
        configured: Boolean(cs),
        endsAt: cs?.ends_at ?? null,
        isActive: cs?.is_active ?? false,
      }}
    />
  );
}
