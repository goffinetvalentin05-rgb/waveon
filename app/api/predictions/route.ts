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
 *  - leagueId null = global (un seul pronostic global par user / match)
 *  - vérifie le verrou (kickoff_at + locked_at)
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

  // Vérifier le verrou côté serveur
  const { data: match } = await supabase
    .from("matches")
    .select("id, kickoff_at, status")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return bad("Match introuvable.", 404);
  if (match.status === "finished" || match.status === "cancelled") {
    return bad("Match terminé : impossible de pronostiquer.", 409);
  }
  if (isPredictionLocked(null, match.kickoff_at as string)) {
    return bad("Le pronostic est verrouillé (coup d'envoi passé).", 409);
  }

  // Si leagueId fourni, vérifier appartenance
  if (leagueId) {
    const { data: membership } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return bad("Tu n'es pas membre de cette ligue.", 403);
  }

  const predictedWinner = home > away ? "home" : away > home ? "away" : "draw";

  const upsertPayload = {
    user_id: user.id,
    match_id: matchId,
    league_id: leagueId,
    predicted_home_score: home,
    predicted_away_score: away,
    predicted_winner: predictedWinner,
  };

  // Pour upsert avec contrainte (user_id, match_id, league_id) où league_id peut être null,
  // on fait insert puis on retombe sur update si conflit.
  const { error: upErr } = await supabase
    .from("predictions")
    .upsert(upsertPayload, { onConflict: "user_id,match_id,league_id" });

  if (upErr) {
    console.error("[predictions] upsert", upErr);
    return bad(upErr.message, 500);
  }

  return NextResponse.json({ ok: true });
}
