import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAvatarColorId } from "@/lib/pronoclash/avatar-colors";
import { sendWelcomeEmail } from "@/lib/emails/send";

export const runtime = "nodejs";

type OnboardingPayload = {
  username?: unknown;
  avatarColor?: unknown;
  consentTerms?: unknown;
  consentContestRules?: unknown;
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

  const consentTerms = body.consentTerms === true;
  const consentContestRules = body.consentContestRules === true;
  const consentMarketingApp = body.consentMarketingApp === true;
  const consentPartnerOffers = body.consentPartnerOffers === true;

  if (!consentTerms) {
    return bad("Les conditions générales doivent être acceptées.");
  }
  if (!consentContestRules) {
    return bad("Le règlement du concours doit être accepté.");
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return bad("Non authentifié.", 401);

  const admin = createAdminSupabaseClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) return bad("Ce pseudo est déjà pris.");

  const now = new Date().toISOString();

  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        username,
        avatar_color: avatarColor,
        consent_terms_required: consentTerms,
        consent_contest_rules_required: consentContestRules,
        consent_marketing_app: consentMarketingApp,
        consent_partner_offers: consentPartnerOffers,
        consent_created_at: now,
        onboarded_at: now,
      },
      { onConflict: "id" }
    );
  if (profileErr) {
    console.error("[onboarding] profile upsert", profileErr);
    return bad(profileErr.message, 500);
  }

  // Rejoindre automatiquement la ligue générale
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
    void sendWelcomeEmail({ to: user.email, username }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
