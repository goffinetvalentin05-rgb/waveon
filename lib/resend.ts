import { Resend } from "resend";

export const EMAIL_FROM =
  `${process.env.EMAIL_FROM_NAME ?? "Waevon"} <${process.env.EMAIL_FROM_ADDRESS ?? "noreply@waevon.com"}>`;

export const EMAIL_REPLY_TO_FALLBACK =
  process.env.EMAIL_REPLY_TO_FALLBACK ?? "contact@waevon.com";

// Initialisation lazy : évite le throw à l'évaluation du module si la clé est absente.
let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("[resend] RESEND_API_KEY manquante.");
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
