import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeWinner,
  scorePrediction,
  type MatchOutcome,
} from "@/lib/pronoclash/scoring";

/**
 * Finalise un match : marque le résultat, calcule les points de TOUS les
 * pronostics liés (global et toutes les ligues), met à jour league_members.points
 * et profiles.total_points, et écrit des scoring_events.
 *
 * Idempotent : on supprime d'abord les scoring_events liés au match.
 */
export async function finalizeMatch(
  admin: SupabaseClient,
  args: {
    matchId: string;
    homeScore: number;
    awayScore: number;
  }
): Promise<{ updated: number }> {
  const { matchId, homeScore, awayScore } = args;
  const winner: MatchOutcome = computeWinner(homeScore, awayScore);

  // 1) update match
  const { error: mErr } = await admin
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      winner,
      status: "finished",
    })
    .eq("id", matchId);
  if (mErr) throw new Error(`update match: ${mErr.message}`);

  // 2) reset scoring events liés à ce match (idempotence)
  const { data: oldEvents } = await admin
    .from("scoring_events")
    .select("user_id, league_id, points")
    .eq("match_id", matchId);

  await admin.from("scoring_events").delete().eq("match_id", matchId);

  // Soustraire les anciens scores des totaux
  if (oldEvents && oldEvents.length > 0) {
    type OldEv = { user_id: string | null; league_id: string | null; points: number };
    const byUser = new Map<string, number>();
    const byLeague = new Map<string, number>();
    for (const e of oldEvents as OldEv[]) {
      if (e.user_id) byUser.set(e.user_id, (byUser.get(e.user_id) ?? 0) + e.points);
      if (e.user_id && e.league_id) {
        const k = `${e.league_id}::${e.user_id}`;
        byLeague.set(k, (byLeague.get(k) ?? 0) + e.points);
      }
    }
    // Décrémenter via rpc / select-then-update
    await Promise.all([
      ...Array.from(byUser.entries()).map(async ([userId, pts]) => {
        const { data } = await admin.from("profiles").select("total_points").eq("id", userId).maybeSingle();
        if (data) {
          await admin
            .from("profiles")
            .update({ total_points: Math.max(0, (data.total_points ?? 0) - pts) })
            .eq("id", userId);
        }
      }),
      ...Array.from(byLeague.entries()).map(async ([key, pts]) => {
        const [leagueId, userId] = key.split("::");
        const { data } = await admin
          .from("league_members")
          .select("points")
          .eq("league_id", leagueId)
          .eq("user_id", userId)
          .maybeSingle();
        if (data) {
          await admin
            .from("league_members")
            .update({ points: Math.max(0, (data.points ?? 0) - pts) })
            .eq("league_id", leagueId)
            .eq("user_id", userId);
        }
      }),
    ]);
  }

  // 3) récupérer les pronostics
  const { data: preds } = await admin
    .from("predictions")
    .select(
      "id, user_id, league_id, predicted_home_score, predicted_away_score, joker_x2"
    )
    .eq("match_id", matchId);

  type Pred = {
    id: string;
    user_id: string;
    league_id: string | null;
    predicted_home_score: number;
    predicted_away_score: number;
    joker_x2: boolean | null;
  };
  const predictions = (preds ?? []) as Pred[];

  // 4) charger les cards_plays actives sur ce match (pour bus_gare/hold_up/outsider/joker)
  const { data: plays } = await admin
    .from("card_plays")
    .select("user_id, league_id, card_id")
    .eq("match_id", matchId)
    .eq("status", "active");
  type Play = { user_id: string; league_id: string; card_id: string };
  const playsList = (plays ?? []) as Play[];
  const playKey = (userId: string, leagueId: string, cardId: string) =>
    `${userId}::${leagueId}::${cardId}`;
  const activePlays = new Set(
    playsList.map((p) => playKey(p.user_id, p.league_id, p.card_id))
  );

  // 5) outsider : si une équipe est marquée is_outsider
  const { data: matchTeams } = await admin
    .from("matches")
    .select(
      "home:home_team_id(id, is_outsider), away:away_team_id(id, is_outsider)"
    )
    .eq("id", matchId)
    .maybeSingle();
  type SideTeam = { id: string; is_outsider: boolean | null } | null;
  type MatchTeams = { home: SideTeam; away: SideTeam } | null;
  const mt = matchTeams as MatchTeams;
  const outsiderSide: "home" | "away" | null =
    mt?.home?.is_outsider ? "home" : mt?.away?.is_outsider ? "away" : null;

  // 6) calcul + persistance par lot
  let updated = 0;
  for (const p of predictions) {
    const isPrivate = p.league_id != null;
    const usesCard = (cardId: string) =>
      isPrivate && activePlays.has(playKey(p.user_id, p.league_id as string, cardId));

    const { points, reasons } = scorePrediction(
      {
        predicted_home_score: p.predicted_home_score,
        predicted_away_score: p.predicted_away_score,
      },
      { home_score: homeScore, away_score: awayScore, winner },
      {
        joker_x2: Boolean(p.joker_x2) || usesCard("joker_x2"),
        bus_gare: usesCard("bus_gare"),
        hold_up: usesCard("hold_up"),
        outsider_team: usesCard("outsider") ? outsiderSide : null,
      }
    );

    // update prediction
    await admin
      .from("predictions")
      .update({
        points,
        locked_at: new Date().toISOString(),
      })
      .eq("id", p.id);

    // Insertion d'un scoring_event agrégé (avec breakdown JSON dans `reason`)
    if (reasons.length > 0) {
      await admin.from("scoring_events").insert(
        reasons.map((r) => ({
          user_id: p.user_id,
          league_id: p.league_id,
          match_id: matchId,
          prediction_id: p.id,
          points: r.points,
          reason: r.reason,
        }))
      );
    }

    // Mettre à jour totaux
    if (points > 0) {
      // profile total
      const { data: prof } = await admin
        .from("profiles")
        .select("total_points")
        .eq("id", p.user_id)
        .maybeSingle();
      await admin
        .from("profiles")
        .update({ total_points: (prof?.total_points ?? 0) + points })
        .eq("id", p.user_id);

      // league_members
      if (p.league_id) {
        const { data: lm } = await admin
          .from("league_members")
          .select("points")
          .eq("league_id", p.league_id)
          .eq("user_id", p.user_id)
          .maybeSingle();
        if (lm) {
          await admin
            .from("league_members")
            .update({ points: (lm.points ?? 0) + points })
            .eq("league_id", p.league_id)
            .eq("user_id", p.user_id);
        }
      }
    }
    updated++;
  }

  // 7) appliquer effet "Tacle glissé" (vol de 2 pts à la cible si auteur > cible)
  await applyTacleGlisseEffects(admin, matchId);

  return { updated };
}

async function applyTacleGlisseEffects(admin: SupabaseClient, matchId: string): Promise<void> {
  const { data: tacles } = await admin
    .from("card_plays")
    .select("id, user_id, league_id, target_user_id")
    .eq("match_id", matchId)
    .eq("card_id", "tacle_glisse")
    .eq("status", "active");
  type Tacle = {
    id: string;
    user_id: string;
    league_id: string;
    target_user_id: string | null;
  };
  const list = (tacles ?? []) as Tacle[];
  if (list.length === 0) return;

  for (const t of list) {
    if (!t.target_user_id) continue;
    const [authorPredRes, targetPredRes] = await Promise.all([
      admin
        .from("predictions")
        .select("points")
        .eq("match_id", matchId)
        .eq("user_id", t.user_id)
        .eq("league_id", t.league_id)
        .maybeSingle(),
      admin
        .from("predictions")
        .select("points")
        .eq("match_id", matchId)
        .eq("user_id", t.target_user_id)
        .eq("league_id", t.league_id)
        .maybeSingle(),
    ]);
    const aPts = authorPredRes.data?.points ?? 0;
    const tPts = targetPredRes.data?.points ?? 0;
    if (aPts > tPts) {
      // Voler 2 pts (max = points dispo de la cible dans cette ligue)
      const { data: lmT } = await admin
        .from("league_members")
        .select("points")
        .eq("league_id", t.league_id)
        .eq("user_id", t.target_user_id)
        .maybeSingle();
      const stolen = Math.min(2, lmT?.points ?? 0);
      if (stolen <= 0) continue;
      await admin
        .from("league_members")
        .update({ points: (lmT?.points ?? 0) - stolen })
        .eq("league_id", t.league_id)
        .eq("user_id", t.target_user_id);

      const { data: lmA } = await admin
        .from("league_members")
        .select("points")
        .eq("league_id", t.league_id)
        .eq("user_id", t.user_id)
        .maybeSingle();
      await admin
        .from("league_members")
        .update({ points: (lmA?.points ?? 0) + stolen })
        .eq("league_id", t.league_id)
        .eq("user_id", t.user_id);

      await admin.from("scoring_events").insert([
        {
          user_id: t.user_id,
          league_id: t.league_id,
          match_id: matchId,
          points: stolen,
          reason: "tacle_glisse_steal",
        },
        {
          user_id: t.target_user_id,
          league_id: t.league_id,
          match_id: matchId,
          points: -stolen,
          reason: "tacle_glisse_stolen",
        },
      ]);
    }
    await admin.from("card_plays").update({ status: "consumed" }).eq("id", t.id);
  }
}
