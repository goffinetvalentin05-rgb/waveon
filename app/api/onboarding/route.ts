import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAvatarColorId } from "@/lib/pronoclash/avatar-colors";
import { sendWelcomeEmail } from "@/lib/emails/send";

export const runtime = "nodejs";

type OnboardingPayload = {
  username?: unknown;
  avatarColor?: unknown;
  championTeamId?: unknown;
  topScorerId?: unknown;
  consentTerms?: unknown;
  consentMarketingApp?: unknown;
  consentPartnerOffers?: unknown;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: OnboardingPayload;
  try {
    body = (await req.json()) as OnboardingPayload;
  } catch {
    return bad("Corps JSON invalide.");
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!username || username.length < 2 || username.length > 24) {
    return bad("Pseudo invalide (2 à 24 caractères).");
  }
  if (!/^[a-zA-Z0-9_.\- ]+$/.test(username)) {
    return bad("Pseudo invalide : lettres, chiffres, _ . - et espaces uniquement.");
  }

  const avatarColor = typeof body.avatarColor === "string" ? body.avatarColor : "";
  if (!isAvatarColorId(avatarColor)) {
    return bad("Couleur d'avatar invalide.");
  }

  const championTeamId =
    typeof body.championTeamId === "string" && body.championTeamId.length > 0
      ? body.championTeamId
      : null;
  const topScorerId =
    typeof body.topScorerId === "string" && body.topScorerId.length > 0
      ? body.topScorerId
      : null;

  const consentTerms = body.consentTerms === true;
  const consentMarketingApp = body.consentMarketingApp === true;
  const consentPartnerOffers = body.consentPartnerOffers === true;

  if (!consentTerms) {
    return bad("Les conditions et le règlement du concours doivent être acceptés.");
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return bad("Non authentifié.", 401);

  // Vérifier la deadline des prédictions champion/buteur
  const admin = createAdminSupabaseClient();
  const { data: deadlineRow } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "tournament_predictions_deadline")
    .maybeSingle();
  const deadlineRaw =
    (deadlineRow?.value as { deadline?: string | null } | null)?.deadline ?? null;
  const deadlinePassed = deadlineRaw ? new Date(deadlineRaw).getTime() < Date.now() : false;

  // Vérifier unicité du pseudo
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) return bad("Ce pseudo est déjà pris.");

  const now = new Date().toISOString();

  // Profil
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        username,
        avatar_color: avatarColor,
        consent_terms_accepted_at: now,
        consent_marketing_app: consentMarketingApp,
        consent_marketing_app_at: consentMarketingApp ? now : null,
        consent_partner_offers: consentPartnerOffers,
        consent_partner_offers_at: consentPartnerOffers ? now : null,
      },
      { onConflict: "id" }
    );
  if (profileErr) {
    console.error("[onboarding] profile upsert", profileErr);
    return bad(profileErr.message, 500);
  }

  // Prédictions finales (modifiables si pas locked et deadline non passée)
  if (championTeamId || topScorerId) {
    const { error: tpErr } = await admin
      .from("tournament_predictions")
      .upsert(
        {
          user_id: user.id,
          champion_team_id: championTeamId,
          top_scorer_id: topScorerId,
          locked: deadlinePassed,
        },
        { onConflict: "user_id" }
      );
    if (tpErr) {
      console.error("[onboarding] tournament_predictions", tpErr);
      return bad(tpErr.message, 500);
    }
  }

  // Entrée concours gratuite
  await admin.from("contest_entries").insert({
    user_id: user.id,
    email: user.email ?? "",
    champion_team_id: championTeamId,
    top_scorer_id: topScorerId,
    consent_terms_accepted: consentTerms,
    consent_marketing_app: consentMarketingApp,
    consent_partner_offers: consentPartnerOffers,
  });

  // Rejoindre la ligue globale automatiquement
  const { data: globalLeague } = await admin
    .from("leagues")
    .select("id")
    .eq("kind", "global")
    .maybeSingle();
  if (globalLeague?.id) {
    await admin
      .from("league_members")
      .upsert(
        { league_id: globalLeague.id, user_id: user.id, role: "member" },
        { onConflict: "league_id,user_id" }
      );
  }

  if (user.email) {
    // Best-effort
    void sendWelcomeEmail({ to: user.email, username }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
