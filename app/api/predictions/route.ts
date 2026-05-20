import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import {
  PredictionSaveError,
  saveUserPrediction,
} from "@/lib/pronoclash/save-prediction";

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
 *  → enregistre ou met à jour un pronostic (ligue générale : league_id null).
 *  → verrouillé côté serveur dès locked_at (défaut = kickoff_at).
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
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return bad("Non authentifié.", 401);

  const { data: match } = await supabase
    .from("matches")
    .select("id, kickoff_at, locked_at, status, home_team_id, away_team_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return bad("Match introuvable.", 404);

  if (leagueId) {
    const { data: membership } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return bad("Tu n'es pas membre de cette ligue.", 403);
  }

  try {
    const result = await saveUserPrediction(supabase, {
      userId: user.id,
      match: match as {
        id: string;
        kickoff_at: string;
        locked_at: string | null;
        status: string;
        home_team_id: string | null;
        away_team_id: string | null;
      },
      leagueId,
      home,
      away,
    });
    return NextResponse.json({ ok: true, created: result.created, message: result.message });
  } catch (err) {
    if (err instanceof PredictionSaveError) {
      return bad(err.message, err.status);
    }
    console.error("[predictions]", err);
    return bad("Erreur serveur.", 500);
  }
}
