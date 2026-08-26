import { getResend, EMAIL_FROM, getResendApiKey } from "@/lib/resend";

export async function sendProjectInviteEmail(input: {
  to: string;
  projectName: string;
  inviterName: string;
  roleLabel: string;
  url: string;
  expiresAt: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!getResendApiKey()) {
    return { sent: false, error: "Email non configuré — copiez le lien." };
  }
  try {
    const expires = new Date(input.expiresAt).toLocaleDateString("fr-CH");
    await getResend().emails.send({
      from: EMAIL_FROM,
      to: input.to,
      subject: `${input.inviterName} vous invite à rejoindre ${input.projectName}`,
      html: `
        <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
          <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#6366f1;font-weight:600">WaveOne</p>
          <h1 style="font-size:22px;margin:12px 0 8px">${input.inviterName} vous invite à rejoindre</h1>
          <p style="font-size:28px;font-weight:700;margin:0 0 16px">${input.projectName}</p>
          <p style="color:#64748b;font-size:15px;line-height:1.5">
            Collaborer sur ce projet dans WaveOne. Rôle proposé : <strong>${input.roleLabel}</strong>.
            Le lien expire le ${expires}.
          </p>
          <p style="margin:28px 0">
            <a href="${input.url}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">
              Rejoindre le projet
            </a>
          </p>
          <p style="font-size:12px;color:#94a3b8">Si le bouton ne fonctionne pas : ${input.url}</p>
        </div>
      `,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Envoi impossible" };
  }
}
