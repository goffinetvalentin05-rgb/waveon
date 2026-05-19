import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { LEAGUE_PLANS } from "@/lib/stripe/config";
import { NewLeaguePageClient } from "./NewLeaguePageClient";

export default async function NewLeaguePage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <NewLeaguePageClient
      username={profile?.username}
      email={user?.email}
      plans={Object.values(LEAGUE_PLANS)}
    />
  );
}
