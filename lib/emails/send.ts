import { render } from "@react-email/render";
import { getResend, getResendApiKey, EMAIL_FROM } from "@/lib/resend";
import { getAppBaseUrl, brand } from "@/lib/brand/config";
import WelcomeEmail from "@/lib/emails/templates/WelcomeEmail";
import LeagueCreatedEmail from "@/lib/emails/templates/LeagueCreatedEmail";

/**
 * Envoi des emails transactionnels Prono Clash.
 * Toutes les fonctions sont "silent-fail" : on log l'erreur mais on ne casse pas
 * le flux applicatif (l'utilisateur a déjà une UI à jour).
 */

type SendResult = { ok: boolean; reason?: string };

async function safeSend(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!getResendApiKey()) {
    console.warn(`[email] RESEND_API_KEY manquante, email '${args.subject}' ignoré.`);
    return { ok: false, reason: "no_api_key" };
  }
  try {
    const resend = getResend();
    const res = await resend.emails.send({
      from: EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    type ResendRes = { error?: { message?: string } | null; data?: { id?: string } | null };
    const r = res as ResendRes;
    if (r.error?.message) {
      console.error(`[email] resend error '${args.subject}':`, r.error.message);
      return { ok: false, reason: r.error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[email] exception '${args.subject}':`, msg);
    return { ok: false, reason: msg };
  }
}

export async function sendWelcomeEmail(args: {
  to: string;
  username: string;
}): Promise<SendResult> {
  const html = await render(
    WelcomeEmail({ username: args.username, baseUrl: getAppBaseUrl() })
  );
  return safeSend({
    to: args.to,
    subject: `Bienvenue sur ${brand.name}, ${args.username}`,
    html,
  });
}

export async function sendLeagueCreatedEmail(args: {
  to: string;
  username: string;
  leagueName: string;
  inviteUrl: string;
  leagueUrl: string;
}): Promise<SendResult> {
  const html = await render(
    LeagueCreatedEmail({
      username: args.username,
      leagueName: args.leagueName,
      inviteUrl: args.inviteUrl,
      leagueUrl: args.leagueUrl,
    })
  );
  return safeSend({
    to: args.to,
    subject: `Ta ligue "${args.leagueName}" est prête sur ${brand.name}`,
    html,
  });
}
