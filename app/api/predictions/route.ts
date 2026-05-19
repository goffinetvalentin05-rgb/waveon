import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { isPredictionLocked } from "@/lib/pronoclash/scoring";

export const runtime = "nodejs";

type Payload = {
  matchId?: unknown;
  leagueId?: unknown;
  homeScore?: unknown;
  awayScore?: unknown;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/predictions
 *  → enregistre un pronostic pour un match.
 *  - leagueId null = ligue générale (un seul pronostic global par user / match)
 *  - leagueId fourni = ligue privée (vérifie l'appartenance)
 *  - verrouille au coup d'envoi (kickoff_at) ou à locked_at
 */
export async function POST(req: Request) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return bad("Corps JSON invalide.");
  }

  const matchId = typeof body.matchId === "string" ? body.matchId : null;
  if (!matchId) return bad("matchId requis.");

  const leagueId = typeof body.leagueId === "string" ? body.leagueId : null;
  const home = Number(body.homeScore);
  const away = Number(body.awayScore);

  if (!Number.isInteger(home) || home < 0 || home > 20) return bad("Score domicile invalide.");
  if (!Number.isInteger(away) || away < 0 || away > 20) return bad("Score extérieur invalide.");

  const supabase = await createRouteHandlerSupabase();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return bad("Non authentifié.", 401);

  const { data: match } = await supabase
    .from("matches")
    .select("id, kickoff_at, locked_at, status, home_team_id, away_team_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return bad("Match introuvable.", 404);
  if (match.status === "finished" || match.status === "postponed") {
    return bad("Match indisponible : impossible de pronostiquer.", 409);
  }
  if (
    isPredictionLocked(match.locked_at as string | null, match.kickoff_at as string)
  ) {
    return bad("Le pronostic est verrouillé.", 409);
  }

  if (leagueId) {
    const { data: membership } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return bad("Tu n'es pas membre de cette ligue.", 403);
  }

  const homeTeamId = (match as { home_team_id: string | null }).home_team_id;
  const awayTeamId = (match as { away_team_id: string | null }).away_team_id;
  const isDraw = home === away;
  const predictedWinnerTeamId = isDraw
    ? null
    : home > away
      ? homeTeamId
      : awayTeamId;

  const upsertPayload = {
    user_id: user.id,
    match_id: matchId,
    league_id: leagueId,
    predicted_home_score: home,
    predicted_away_score: away,
    predicted_winner_team_id: predictedWinnerTeamId,
    predicted_is_draw: isDraw,
  };

  const { error: upErr } = await supabase
    .from("predictions")
    .upsert(upsertPayload, { onConflict: "user_id,match_id,league_id" });

  if (upErr) {
    console.error("[predictions] upsert", upErr);
    return bad(upErr.message, 500);
  }

  return NextResponse.json({ ok: true });
}
