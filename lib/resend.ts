import { Resend } from "resend";
import { brand } from "@/lib/brand/config";

export const EMAIL_FROM =
  `${process.env.EMAIL_FROM_NAME ?? brand.name} <${
    process.env.EMAIL_FROM_ADDRESS ?? `noreply@${brand.domain}`
  }>`;

export const EMAIL_REPLY_TO_FALLBACK =
  process.env.EMAIL_REPLY_TO_FALLBACK ?? brand.contactEmail;

/** Clé serveur uniquement. */
export function getResendApiKey(): string | undefined {
  const v = process.env.RESEND_API_KEY?.trim();
  return v || undefined;
}

let _resend: Resend | null = null;

export function getResend(): Resend {
  const key = getResendApiKey();
  if (!key) {
    throw new Error("[resend] RESEND_API_KEY manquante.");
  }
  if (!_resend) {
    _resend = new Resend(key);
  }
  return _resend;
}
