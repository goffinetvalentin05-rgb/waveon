import { Suspense } from "react";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { MATCH_SELECT_WITH_TEAMS } from "@/lib/pronoclash/match-display";
import { V1_CARD_IDS } from "@/lib/pronoclash/card-messages";
import { MatchesClient } from "./MatchesClient";

export default async function MatchesPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, matchesRes, predictionsRes, leaguesRes, cardsRes] = await Promise.all([
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
    supabase
      .from("cards")
      .select("id, name, description")
      .in("id", [...V1_CARD_IDS])
      .eq("is_active", true),
  ]);

  type RawLeague = {
    league_id: string;
    leagues: { id: string; slug: string; name: string; kind: string } | null;
  };
  const leagues = (leaguesRes.data ?? []) as unknown as RawLeague[];
  const privateLeagueIds = leagues
    .map((l) => l.leagues)
    .filter((l): l is { id: string; slug: string; name: string; kind: string } => !!l && l.kind !== "global")
    .map((l) => l.id);

  let cardInventory: { league_id: string; card_id: string; quantity: number }[] = [];
  let cardPlays: { league_id: string; match_id: string; card_id: string }[] = [];
  const membersByLeague: Record<string, { user_id: string; username: string | null }[]> = {};

  if (user && privateLeagueIds.length > 0) {
    const [inventoryRes, cardPlaysRes, membersRes] = await Promise.all([
      supabase
        .from("card_inventory")
        .select("league_id, card_id, quantity")
        .eq("user_id", user.id)
        .in("league_id", privateLeagueIds),
      supabase
        .from("card_plays")
        .select("league_id, match_id, card_id")
        .eq("user_id", user.id)
        .in("league_id", privateLeagueIds),
      supabase
        .from("league_members")
        .select("league_id, user_id, profiles:user_id(username)")
        .in("league_id", privateLeagueIds),
    ]);
    cardInventory = (inventoryRes.data ?? []) as typeof cardInventory;
    cardPlays = (cardPlaysRes.data ?? []) as typeof cardPlays;
    for (const row of membersRes.data ?? []) {
      const lid = row.league_id as string;
      const prof = row.profiles as unknown as { username: string | null } | null;
      if (!membersByLeague[lid]) membersByLeague[lid] = [];
      membersByLeague[lid].push({
        user_id: row.user_id as string,
        username: prof?.username ?? null,
      });
    }
  }

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

  type RawCard = { id: string; name: string; description: string };
  const cardsCatalog = (cardsRes.data ?? []) as RawCard[];

  return (
    <Suspense fallback={<div className="pc-wrap"><div className="pc-inner"><p className="pc-body-text">Chargement des matchs…</p></div></div>}>
      <MatchesClient
        username={profileRes.data?.username}
        email={user?.email}
        matches={matches}
        predictions={predictions}
        leagues={leagues
          .map((l) => l.leagues)
          .filter((l): l is { id: string; slug: string; name: string; kind: string } => !!l)}
        userId={user?.id ?? null}
        cardsCatalog={cardsCatalog}
        cardInventory={cardInventory}
        cardPlays={cardPlays}
        membersByLeague={membersByLeague}
      />
    </Suspense>
  );
}
