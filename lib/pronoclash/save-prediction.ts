import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isPredictionLocked,
  PREDICTION_LOCKED_MESSAGE,
} from "@/lib/pronoclash/prediction-lock";
import { CARD_MESSAGES } from "@/lib/pronoclash/card-messages";

type MatchRow = {
  id: string;
  kickoff_at: string;
  locked_at: string | null;
  status: string;
  home_team_id: string | null;
  away_team_id: string | null;
};

export class PredictionSaveError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function findUserPrediction(
  supabase: SupabaseClient,
  userId: string,
  matchId: string,
  leagueId: string | null
) {
  let q = supabase
    .from("predictions")
    .select("id, locked_at")
    .eq("user_id", userId)
    .eq("match_id", matchId);

  if (leagueId) {
    q = q.eq("league_id", leagueId);
  } else {
    q = q.is("league_id", null);
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw new PredictionSaveError("Impossible de charger le pronostic.", 500);
  return data as { id: string; locked_at: string | null } | null;
}

async function userHasVarPlay(
  supabase: SupabaseClient,
  userId: string,
  matchId: string,
  leagueId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("card_plays")
    .select("id")
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .eq("match_id", matchId)
    .eq("card_id", "var")
    .maybeSingle();
  return !!data;
}

async function userHasCartonRouge(
  supabase: SupabaseClient,
  userId: string,
  matchId: string,
  leagueId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("card_plays")
    .select("id")
    .eq("target_user_id", userId)
    .eq("league_id", leagueId)
    .eq("match_id", matchId)
    .eq("card_id", "carton_rouge")
    .maybeSingle();
  return !!data;
}

export async function assertMatchOpenForPrediction(
  supabase: SupabaseClient,
  match: MatchRow,
  userId: string,
  leagueId: string | null,
  now = new Date()
) {
  if (match.status !== "scheduled") {
    throw new PredictionSaveError(PREDICTION_LOCKED_MESSAGE, 409);
  }

  if (leagueId) {
    const carton = await userHasCartonRouge(supabase, userId, match.id, leagueId);
    if (carton) {
      throw new PredictionSaveError(CARD_MESSAGES.cartonBlocked, 409);
    }
    const varActive = await userHasVarPlay(supabase, userId, match.id, leagueId);
    if (isPredictionLocked(match.locked_at, match.kickoff_at, now, { varActive })) {
      throw new PredictionSaveError(PREDICTION_LOCKED_MESSAGE, 409);
    }
    return;
  }

  if (isPredictionLocked(match.locked_at, match.kickoff_at, now)) {
    throw new PredictionSaveError(PREDICTION_LOCKED_MESSAGE, 409);
  }
}

export async function saveUserPrediction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    match: MatchRow;
    leagueId: string | null;
    home: number;
    away: number;
  }
): Promise<{ created: boolean; message: string }> {
  const { userId, match, leagueId, home, away } = params;
  await assertMatchOpenForPrediction(supabase, match, userId, leagueId);

  const homeTeamId = match.home_team_id;
  const awayTeamId = match.away_team_id;
  const isDraw = home === away;
  const predictedWinnerTeamId = isDraw
    ? null
    : home > away
      ? homeTeamId
      : awayTeamId;

  const scores = {
    predicted_home_score: home,
    predicted_away_score: away,
    predicted_winner_team_id: predictedWinnerTeamId,
    predicted_is_draw: isDraw,
    updated_at: new Date().toISOString(),
  };

  const existing = await findUserPrediction(supabase, userId, match.id, leagueId);

  if (existing) {
    if (
      existing.locked_at &&
      isPredictionLocked(existing.locked_at, undefined, new Date())
    ) {
      throw new PredictionSaveError(CARD_MESSAGES.cartonBlocked, 409);
    }
    const { error } = await supabase
      .from("predictions")
      .update(scores)
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) {
      console.error("[predictions] update", error);
      throw new PredictionSaveError("Impossible de mettre à jour le pronostic.", 500);
    }
    return { created: false, message: "Pronostic mis à jour" };
  }

  const { error: insertErr } = await supabase.from("predictions").insert({
    user_id: userId,
    match_id: match.id,
    league_id: leagueId,
    ...scores,
  });

  if (insertErr?.code === "23505") {
    const again = await findUserPrediction(supabase, userId, match.id, leagueId);
    if (again) {
      const { error: upErr } = await supabase
        .from("predictions")
        .update(scores)
        .eq("id", again.id)
        .eq("user_id", userId);
      if (!upErr) {
        return { created: false, message: "Pronostic mis à jour" };
      }
    }
  }

  if (insertErr) {
    console.error("[predictions] insert", insertErr);
    throw new PredictionSaveError("Impossible d'enregistrer le pronostic.", 500);
  }

  return { created: true, message: "Pronostic enregistré" };
}
