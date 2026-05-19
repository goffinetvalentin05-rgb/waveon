import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
const VAR_MAX_DELAY_MINUTES = 15;

/**
 * POST /api/cards/play
 *  - vérifie l'inventaire
 *  - applique les contraintes (max 1 carte par match/user/league, cible requise…)
 *  - décrémente l'inventaire et écrit card_plays
 *  - effets immédiats : vol_score (copie le prono), VAR (assouplit le verrou)
 *  - effets différés : joker_x2, bus_gare, hold_up, outsider, tacle_glisse
 *    (appliqués à la finalisation du match)
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

  const supabase = await createRouteHandlerSupabase();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return bad("Non authentifié.", 401);

  const admin = createAdminSupabaseClient();

  // Vérifier carte
  const { data: cardRow } = await admin.from("cards").select("id, enabled").eq("id", cardId).maybeSingle();
  if (!cardRow || cardRow.enabled === false) return bad("Carte inconnue ou désactivée.");

  // Vérifier ligue (must be private)
  const { data: league } = await admin
    .from("leagues")
    .select("id, kind, status")
    .eq("id", leagueId)
    .maybeSingle();
  if (!league) return bad("Ligue introuvable.", 404);
  if (league.kind === "global") return bad("Les cartes ne sont pas disponibles dans la ligue globale.", 403);
  if (league.status !== "active") return bad("Ligue inactive.", 403);

  // Vérifier appartenance + cible appartient à la ligue
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

  // Vérifier match + verrouillage selon carte
  const { data: match } = await admin
    .from("matches")
    .select("id, kickoff_at, status")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return bad("Match introuvable.", 404);
  if (match.status === "finished" || match.status === "cancelled") {
    return bad("Match terminé.", 409);
  }

  const kickoffMs = new Date(match.kickoff_at as string).getTime();
  const nowMs = Date.now();
  if (cardId === "var") {
    // VAR permet jusqu'à kickoff + 15 min
    if (nowMs > kickoffMs + VAR_MAX_DELAY_MINUTES * 60_000) {
      return bad(`La VAR n'est plus utilisable (limite +${VAR_MAX_DELAY_MINUTES} min après kickoff).`, 409);
    }
  } else {
    if (nowMs >= kickoffMs) {
      return bad("Le coup d'envoi est passé : carte refusée.", 409);
    }
  }

  // Max 1 carte par user/match/league
  const { data: alreadyPlayed } = await admin
    .from("card_plays")
    .select("id")
    .eq("user_id", user.id)
    .eq("league_id", leagueId)
    .eq("match_id", matchId)
    .maybeSingle();
  if (alreadyPlayed) return bad("Tu as déjà joué une carte sur ce match.", 409);

  // Vérifier inventaire
  const { data: inv } = await admin
    .from("card_inventory")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("league_id", leagueId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (!inv || (inv.quantity ?? 0) <= 0) return bad("Tu n'as pas cette carte.", 409);

  // Si carton_rouge sur cible : la cible ne peut plus modifier son prono.
  // On marque locked_at = now sur sa prediction existante.
  if (cardId === "carton_rouge" && targetUserId) {
    await admin
      .from("predictions")
      .update({ locked_at: new Date().toISOString() })
      .eq("match_id", matchId)
      .eq("user_id", targetUserId)
      .eq("league_id", leagueId);
  }

  // Si vol_score : copie le pronostic de la cible (s'il existe) dans le mien.
  if (cardId === "vol_score" && targetUserId) {
    const { data: targetPred } = await admin
      .from("predictions")
      .select("predicted_home_score, predicted_away_score")
      .eq("match_id", matchId)
      .eq("user_id", targetUserId)
      .eq("league_id", leagueId)
      .maybeSingle();
    if (!targetPred) return bad("La cible n'a pas encore pronostiqué : vol impossible.", 409);
    const winner =
      targetPred.predicted_home_score > targetPred.predicted_away_score
        ? "home"
        : targetPred.predicted_away_score > targetPred.predicted_home_score
          ? "away"
          : "draw";
    await admin
      .from("predictions")
      .upsert(
        {
          user_id: user.id,
          league_id: leagueId,
          match_id: matchId,
          predicted_home_score: targetPred.predicted_home_score,
          predicted_away_score: targetPred.predicted_away_score,
          predicted_winner: winner,
        },
        { onConflict: "user_id,match_id,league_id" }
      );
  }

  // Si joker_x2 : on marque le flag sur la prediction (en plus de l'event card_plays)
  if (cardId === "joker_x2") {
    await admin
      .from("predictions")
      .upsert(
        {
          user_id: user.id,
          league_id: leagueId,
          match_id: matchId,
          predicted_home_score: 0,
          predicted_away_score: 0,
          joker_x2: true,
        },
        { onConflict: "user_id,match_id,league_id", ignoreDuplicates: false }
      );
    // si la ligne existait déjà, on met juste joker_x2 = true
    await admin
      .from("predictions")
      .update({ joker_x2: true })
      .eq("user_id", user.id)
      .eq("league_id", leagueId)
      .eq("match_id", matchId);
  }

  // Décrémenter inventaire + enregistrer play
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
    status: "active",
  });

  return NextResponse.json({ ok: true });
}
