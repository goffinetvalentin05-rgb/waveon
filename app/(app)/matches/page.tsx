import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { MatchesClient } from "./MatchesClient";

export default async function MatchesPage() {
  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const [matchesRes, predictionsRes, leaguesRes] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, match_number, kickoff_at, locked_at, status, stage, group_name, venue, city, country, home_score, away_score, home_placeholder, away_placeholder, home:home_team_id(id, name, country_code, flag_emoji), away:away_team_id(id, name, country_code, flag_emoji)"
      )
      .order("kickoff_at"),
    user
      ? supabase
          .from("predictions")
          .select("id, match_id, league_id, predicted_home_score, predicted_away_score")
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
  };
  const predictions = (predictionsRes.data ?? []) as RawPrediction[];

  type RawLeague = {
    league_id: string;
    leagues: { id: string; slug: string; name: string; kind: string } | null;
  };
  const leagues = (leaguesRes.data ?? []) as unknown as RawLeague[];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">Matchs</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          Tes pronostics
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Score exact = +5 pts. Bon vainqueur ou bon nul = +3 pts. Bon écart de buts = +1 bonus.
          Tu peux modifier ton prono jusqu&apos;au coup d&apos;envoi.
        </p>
      </header>

      {matches.length === 0 ? (
        <div className={`${ui.glassCard} p-8 text-center text-sm text-white/60`}>
          Aucun match programmé pour le moment. L&apos;admin va en ajouter dans /admin/tournament/matches.
        </div>
      ) : (
        <MatchesClient
          matches={matches}
          predictions={predictions}
          leagues={leagues
            .map((l) => l.leagues)
            .filter((l): l is { id: string; slug: string; name: string; kind: string } => !!l)}
        />
      )}
    </div>
  );
}
