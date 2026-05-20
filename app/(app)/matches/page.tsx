import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { MATCH_SELECT_WITH_TEAMS } from "@/lib/pronoclash/match-display";
import { MatchesClient } from "./MatchesClient";

export default async function MatchesPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, matchesRes, predictionsRes, leaguesRes] = await Promise.all([
    user
      ? supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("matches").select(MATCH_SELECT_WITH_TEAMS).order("kickoff_at"),
    user
      ? supabase
          .from("predictions")
          .select(
            "id, match_id, league_id, predicted_home_score, predicted_away_score, points, is_locked"
          )
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as never[] }),
    user
      ? supabase
          .from("league_members")
          .select("league_id, leagues:league_id(id, slug, name, kind)")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  type RawMatch = {
    id: string;
    match_number: number | null;
    kickoff_at: string;
    locked_at: string;
    status: "scheduled" | "live" | "finished" | "postponed";
    stage: string;
    group_name: string | null;
    venue: string | null;
    city: string | null;
    country: string | null;
    home_score: number | null;
    away_score: number | null;
    home_placeholder: string | null;
    away_placeholder: string | null;
    home: { id: string; name: string; country_code: string | null; flag_emoji: string | null } | null;
    away: { id: string; name: string; country_code: string | null; flag_emoji: string | null } | null;
  };
  const matches = (matchesRes.data ?? []) as unknown as RawMatch[];

  type RawPrediction = {
    id: string;
    match_id: string;
    league_id: string | null;
    predicted_home_score: number;
    predicted_away_score: number;
    points: number;
    is_locked: boolean;
  };
  const predictions = (predictionsRes.data ?? []) as RawPrediction[];

  type RawLeague = {
    league_id: string;
    leagues: { id: string; slug: string; name: string; kind: string } | null;
  };
  const leagues = (leaguesRes.data ?? []) as unknown as RawLeague[];

  return (
    <MatchesClient
      username={profileRes.data?.username}
      email={user?.email}
      matches={matches}
      predictions={predictions}
      leagues={leagues
        .map((l) => l.leagues)
        .filter((l): l is { id: string; slug: string; name: string; kind: string } => !!l)}
    />
  );
}
