import type { SupabaseClient } from "@supabase/supabase-js";
import { computeWinner, type MatchOutcome } from "@/lib/pronoclash/scoring";
import { recalculateMatchPoints } from "@/lib/scoring/recalculate";

/**
 * Finalise un match : enregistre le résultat puis recalcule les points.
 * Idempotent via recalculateMatchPoints.
 */
export async function finalizeMatch(
  admin: SupabaseClient,
  args: {
    matchId: string;
    homeScore: number;
    awayScore: number;
    forceStatus?: "finished";
  }
): Promise<{ updated: number }> {
  const { matchId, homeScore, awayScore } = args;
  const winner: MatchOutcome = computeWinner(homeScore, awayScore);
  const isDraw = winner === "draw";

  const { data: matchRow, error: matchLoadErr } = await admin
    .from("matches")
    .select("home_team_id, away_team_id")
    .eq("id", matchId)
    .maybeSingle();
  if (matchLoadErr) throw new Error(`load match: ${matchLoadErr.message}`);
  if (!matchRow) throw new Error("match introuvable");

  const homeTeamId = (matchRow as { home_team_id: string | null }).home_team_id;
  const awayTeamId = (matchRow as { away_team_id: string | null }).away_team_id;
  const winnerTeamId =
    winner === "home" ? homeTeamId : winner === "away" ? awayTeamId : null;

  const { error: mErr } = await admin
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      winner_team_id: winnerTeamId,
      is_draw: isDraw,
      status: args.forceStatus ?? "finished",
      score_last_synced_at: new Date().toISOString(),
    })
    .eq("id", matchId);
  if (mErr) throw new Error(`update match: ${mErr.message}`);

  const updated = await recalculateMatchPoints(admin, matchId);
  return { updated };
}
