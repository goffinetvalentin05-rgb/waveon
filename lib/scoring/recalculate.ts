import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeWinner,
  scorePrediction,
  type MatchOutcome,
} from "@/lib/pronoclash/scoring";
import { computeTacleSteal } from "@/lib/pronoclash/card-effects";

/**
 * Recalcule les points de tous les pronostics d'un match terminé.
 * Idempotent : annule les anciens scoring_events avant réapplication.
 * Les points globaux (profiles.total_points) ne concernent que league_id IS NULL.
 */
export async function recalculateMatchPoints(
  admin: SupabaseClient,
  matchId: string
): Promise<number> {
  const { data: matchRow, error: matchLoadErr } = await admin
    .from("matches")
    .select(
      "id, status, home_score, away_score, home_team_id, away_team_id"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchLoadErr) throw new Error(`load match: ${matchLoadErr.message}`);
  if (!matchRow) throw new Error("match introuvable");

  const match = matchRow as {
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team_id: string | null;
    away_team_id: string | null;
  };

  if (match.status !== "finished") return 0;
  if (match.home_score == null || match.away_score == null) return 0;

  const homeScore = match.home_score;
  const awayScore = match.away_score;
  const winner: MatchOutcome = computeWinner(homeScore, awayScore);
  const isDraw = winner === "draw";
  const winnerTeamId =
    winner === "home"
      ? match.home_team_id
      : winner === "away"
        ? match.away_team_id
        : null;

  await admin
    .from("matches")
    .update({
      winner_team_id: winnerTeamId,
      is_draw: isDraw,
    })
    .eq("id", matchId);

  const homeTeamId = match.home_team_id;
  const awayTeamId = match.away_team_id;

  const { data: oldEvents } = await admin
    .from("scoring_events")
    .select("user_id, league_id, points")
    .eq("match_id", matchId);

  await admin.from("scoring_events").delete().eq("match_id", matchId);

  if (oldEvents && oldEvents.length > 0) {
    type OldEv = { user_id: string | null; league_id: string | null; points: number };
    const byUserGlobal = new Map<string, number>();
    const byLeague = new Map<string, number>();
    for (const e of oldEvents as OldEv[]) {
      if (!e.user_id) continue;
      if (e.league_id == null) {
        byUserGlobal.set(
          e.user_id,
          (byUserGlobal.get(e.user_id) ?? 0) + e.points
        );
      } else {
        const k = `${e.league_id}::${e.user_id}`;
        byLeague.set(k, (byLeague.get(k) ?? 0) + e.points);
      }
    }
    await Promise.all([
      ...Array.from(byUserGlobal.entries()).map(async ([userId, pts]) => {
        const { data } = await admin
          .from("profiles")
          .select("total_points")
          .eq("id", userId)
          .maybeSingle();
        if (data) {
          await admin
            .from("profiles")
            .update({
              total_points: Math.max(0, (data.total_points ?? 0) - pts),
            })
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

  const { data: preds } = await admin
    .from("predictions")
    .select(
      "id, user_id, league_id, predicted_home_score, predicted_away_score, predicted_winner_team_id, joker_x2"
    )
    .eq("match_id", matchId);

  type Pred = {
    id: string;
    user_id: string;
    league_id: string | null;
    predicted_home_score: number;
    predicted_away_score: number;
    predicted_winner_team_id: string | null;
    joker_x2: boolean | null;
  };
  const predictions = (preds ?? []) as Pred[];

  const { data: plays } = await admin
    .from("card_plays")
    .select("user_id, league_id, card_id")
    .eq("match_id", matchId)
    .in("status", ["played", "active"]);
  type Play = { user_id: string; league_id: string; card_id: string };
  const playsList = (plays ?? []) as Play[];
  const playKey = (userId: string, leagueId: string, cardId: string) =>
    `${userId}::${leagueId}::${cardId}`;
  const activePlays = new Set(
    playsList.map((p) => playKey(p.user_id, p.league_id, p.card_id))
  );

  const { data: matchTeams } = await admin
    .from("matches")
    .select(
      "home:home_team_id(id, is_outsider), away:away_team_id(id, is_outsider)"
    )
    .eq("id", matchId)
    .maybeSingle();
  type SideTeam = { id: string; is_outsider: boolean | null } | null;
  type MatchTeams = { home: SideTeam; away: SideTeam } | null;
  const mt = matchTeams as unknown as MatchTeams;
  const outsiderSide: "home" | "away" | null = mt?.home?.is_outsider
    ? "home"
    : mt?.away?.is_outsider
      ? "away"
      : null;

  let updated = 0;
  for (const p of predictions) {
    const isPrivate = p.league_id != null;
    const usesCard = (cardId: string) =>
      isPrivate &&
      activePlays.has(playKey(p.user_id, p.league_id as string, cardId));

    let predictedOutcome: MatchOutcome;
    if (p.predicted_winner_team_id == null) {
      predictedOutcome = computeWinner(
        p.predicted_home_score,
        p.predicted_away_score
      );
    } else if (p.predicted_winner_team_id === homeTeamId) {
      predictedOutcome = "home";
    } else if (p.predicted_winner_team_id === awayTeamId) {
      predictedOutcome = "away";
    } else {
      predictedOutcome = "draw";
    }

    const cardBonuses = isPrivate
      ? {
          joker_x2: usesCard("joker_x2"),
          bus_gare: false,
          hold_up: false,
          outsider_team: null,
        }
      : {
          joker_x2: false,
        };

    const result = scorePrediction(
      {
        predicted_home_score: p.predicted_home_score,
        predicted_away_score: p.predicted_away_score,
        predicted_winner: predictedOutcome,
      },
      { home_score: homeScore, away_score: awayScore, winner },
      cardBonuses
    );

    await admin
      .from("predictions")
      .update({
        points: result.points,
        exact_score: result.exact_score,
        correct_winner: result.correct_winner,
        correct_goal_difference: result.correct_goal_difference,
        is_locked: true,
        locked_at: new Date().toISOString(),
      })
      .eq("id", p.id);

    if (result.reasons.length > 0) {
      await admin.from("scoring_events").insert(
        result.reasons.map((r) => ({
          user_id: p.user_id,
          league_id: p.league_id,
          match_id: matchId,
          prediction_id: p.id,
          points: r.points,
          reason: r.reason,
        }))
      );
    }

    if (result.points > 0) {
      if (!p.league_id) {
        const { data: prof } = await admin
          .from("profiles")
          .select("total_points")
          .eq("id", p.user_id)
          .maybeSingle();
        await admin
          .from("profiles")
          .update({
            total_points: (prof?.total_points ?? 0) + result.points,
          })
          .eq("id", p.user_id);
      } else {
        const { data: lm } = await admin
          .from("league_members")
          .select("points")
          .eq("league_id", p.league_id)
          .eq("user_id", p.user_id)
          .maybeSingle();
        if (lm) {
          await admin
            .from("league_members")
            .update({ points: (lm.points ?? 0) + result.points })
            .eq("league_id", p.league_id)
            .eq("user_id", p.user_id);
        }
      }
    }
    updated++;
  }

  await applyTacleGlisseEffects(admin, matchId);
  return updated;
}

async function applyTacleGlisseEffects(
  admin: SupabaseClient,
  matchId: string
): Promise<void> {
  const { data: tacles } = await admin
    .from("card_plays")
    .select("user_id, league_id, target_user_id")
    .eq("match_id", matchId)
    .eq("card_id", "tacle_glisse")
    .in("status", ["played", "active"]);
  type Tacle = {
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
        .select("id, points")
        .eq("match_id", matchId)
        .eq("user_id", t.user_id)
        .eq("league_id", t.league_id)
        .maybeSingle(),
      admin
        .from("predictions")
        .select("id, points")
        .eq("match_id", matchId)
        .eq("user_id", t.target_user_id)
        .eq("league_id", t.league_id)
        .maybeSingle(),
    ]);
    const authorPred = authorPredRes.data;
    const targetPred = targetPredRes.data;
    if (!authorPred || !targetPred) continue;

    const aPts = authorPred.points ?? 0;
    const tPts = targetPred.points ?? 0;
    const { stolen, authorDelta, targetDelta } = computeTacleSteal(aPts, tPts);
    if (stolen <= 0) continue;

    const newAuthorPts = aPts + authorDelta;
    const newTargetPts = Math.max(0, tPts + targetDelta);

    await admin
      .from("predictions")
      .update({ points: newAuthorPts })
      .eq("id", authorPred.id);
    await admin
      .from("predictions")
      .update({ points: newTargetPts })
      .eq("id", targetPred.id);

    const { data: lmT } = await admin
      .from("league_members")
      .select("points")
      .eq("league_id", t.league_id)
      .eq("user_id", t.target_user_id)
      .maybeSingle();
    const { data: lmA } = await admin
      .from("league_members")
      .select("points")
      .eq("league_id", t.league_id)
      .eq("user_id", t.user_id)
      .maybeSingle();

    if (lmT) {
      await admin
        .from("league_members")
        .update({ points: Math.max(0, (lmT.points ?? 0) + targetDelta) })
        .eq("league_id", t.league_id)
        .eq("user_id", t.target_user_id);
    }
    if (lmA) {
      await admin
        .from("league_members")
        .update({ points: (lmA.points ?? 0) + authorDelta })
        .eq("league_id", t.league_id)
        .eq("user_id", t.user_id);
    }

    await admin.from("scoring_events").insert([
      {
        user_id: t.user_id,
        league_id: t.league_id,
        match_id: matchId,
        prediction_id: authorPred.id,
        points: authorDelta,
        reason: "tacle_glisse_steal",
      },
      {
        user_id: t.target_user_id,
        league_id: t.league_id,
        match_id: matchId,
        prediction_id: targetPred.id,
        points: targetDelta,
        reason: "tacle_glisse_stolen",
      },
    ]);
  }
}
