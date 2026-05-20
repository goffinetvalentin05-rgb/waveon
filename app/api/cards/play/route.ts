import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  CARD_MESSAGES,
  isV1CardId,
} from "@/lib/pronoclash/card-messages";
import { isPredictionLocked } from "@/lib/pronoclash/prediction-lock";

export const runtime = "nodejs";

type Payload = {
  cardId?: unknown;
  leagueId?: unknown;
  matchId?: unknown;
  targetUserId?: unknown;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const CARDS_NEEDING_TARGET = new Set(["vol_score", "carton_rouge", "tacle_glisse"]);

/**
 * POST /api/cards/play
 *  - ligue privée active uniquement
 *  - max 1 carte par match / joueur / ligue
 *  - avant verrouillage du match (locked_at ou kickoff)
 */
export async function POST(req: Request) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return bad("Corps JSON invalide.");
  }

  const cardId = typeof body.cardId === "string" ? body.cardId : "";
  const leagueId = typeof body.leagueId === "string" ? body.leagueId : "";
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  const targetUserId =
    typeof body.targetUserId === "string" && body.targetUserId.length > 0
      ? body.targetUserId
      : null;

  if (!cardId || !leagueId || !matchId) {
    return bad("Paramètres manquants.");
  }

  if (!isV1CardId(cardId)) {
    return bad("Carte inconnue ou désactivée.");
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return bad("Non authentifié.", 401);

  const admin = createAdminSupabaseClient();

  const { data: cardRow } = await admin
    .from("cards")
    .select("id, is_active")
    .eq("id", cardId)
    .maybeSingle();
  if (!cardRow || cardRow.is_active === false) {
    return bad("Carte inconnue ou désactivée.");
  }

  const { data: league } = await admin
    .from("leagues")
    .select("id, kind, status")
    .eq("id", leagueId)
    .maybeSingle();
  if (!league) return bad("Ligue introuvable.", 404);
  if (league.kind === "global") {
    return bad(CARD_MESSAGES.privateOnly, 403);
  }
  if (league.status !== "active") return bad("Ligue inactive.", 403);

  const { data: mShip } = await admin
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mShip) return bad("Tu n'es pas membre de cette ligue.", 403);

  if (CARDS_NEEDING_TARGET.has(cardId)) {
    if (!targetUserId) return bad("Cette carte nécessite une cible.");
    if (targetUserId === user.id) return bad("Tu ne peux pas te cibler toi-même.");
    const { data: tShip } = await admin
      .from("league_members")
      .select("user_id")
      .eq("league_id", leagueId)
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (!tShip) return bad("La cible n'est pas membre de cette ligue.");
  }

  const { data: match } = await admin
    .from("matches")
    .select("id, kickoff_at, locked_at, status, home_team_id, away_team_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return bad("Match introuvable.", 404);
  if (match.status === "finished" || match.status === "cancelled") {
    return bad(CARD_MESSAGES.locked, 409);
  }

  if (isPredictionLocked(match.locked_at, match.kickoff_at)) {
    return bad(CARD_MESSAGES.locked, 409);
  }

  const { data: alreadyPlayed } = await admin
    .from("card_plays")
    .select("id")
    .eq("user_id", user.id)
    .eq("league_id", leagueId)
    .eq("match_id", matchId)
    .maybeSingle();
  if (alreadyPlayed) return bad(CARD_MESSAGES.alreadyPlayed, 409);

  const { data: inv } = await admin
    .from("card_inventory")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("league_id", leagueId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (!inv || (inv.quantity ?? 0) <= 0) return bad(CARD_MESSAGES.noCard, 409);

  if (cardId === "carton_rouge" && targetUserId) {
    await admin
      .from("predictions")
      .update({ locked_at: new Date().toISOString() })
      .eq("match_id", matchId)
      .eq("user_id", targetUserId)
      .eq("league_id", leagueId);
  }

  if (cardId === "vol_score" && targetUserId) {
    const { data: targetPred } = await admin
      .from("predictions")
      .select("predicted_home_score, predicted_away_score")
      .eq("match_id", matchId)
      .eq("user_id", targetUserId)
      .eq("league_id", leagueId)
      .maybeSingle();
    if (!targetPred) return bad(CARD_MESSAGES.targetNoProno, 409);

    const isDraw =
      targetPred.predicted_home_score === targetPred.predicted_away_score;
    const predictedWinnerTeamId = isDraw
      ? null
      : targetPred.predicted_home_score > targetPred.predicted_away_score
        ? match.home_team_id
        : match.away_team_id;

    const { data: existingMine } = await admin
      .from("predictions")
      .select("id")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .eq("league_id", leagueId)
      .maybeSingle();

    const row = {
      user_id: user.id,
      league_id: leagueId,
      match_id: matchId,
      predicted_home_score: targetPred.predicted_home_score,
      predicted_away_score: targetPred.predicted_away_score,
      predicted_winner_team_id: predictedWinnerTeamId,
      predicted_is_draw: isDraw,
    };

    if (existingMine) {
      await admin.from("predictions").update(row).eq("id", existingMine.id);
    } else {
      await admin.from("predictions").insert(row);
    }
  }

  if (cardId === "joker_x2") {
    const { data: mine } = await admin
      .from("predictions")
      .select("id")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .eq("league_id", leagueId)
      .maybeSingle();
    if (mine) {
      await admin
        .from("predictions")
        .update({ joker_x2: true })
        .eq("id", mine.id);
    }
  }

  await admin
    .from("card_inventory")
    .update({ quantity: Math.max(0, (inv.quantity ?? 0) - 1) })
    .eq("id", inv.id);

  await admin.from("card_plays").insert({
    user_id: user.id,
    league_id: leagueId,
    match_id: matchId,
    card_id: cardId,
    target_user_id: targetUserId,
    status: "played",
  });

  return NextResponse.json({ ok: true, message: CARD_MESSAGES.played });
}
