import { Resend } from "resend";

export const EMAIL_FROM =
  `${process.env.EMAIL_FROM_NAME ?? "Waevon"} <${process.env.EMAIL_FROM_ADDRESS ?? "noreply@waevon.com"}>`;

export const EMAIL_REPLY_TO_FALLBACK =
  process.env.EMAIL_REPLY_TO_FALLBACK ?? "contact@waevon.com";

/** Clé serveur uniquement — ne jamais préfixer en NEXT_PUBLIC_. */
export function getResendApiKey(): string | undefined {
  const v = process.env.RESEND_API_KEY?.trim();
  return v || undefined;
}

/** Noms d’variables d’environnement visibles par Node contenant « RESEND » (diagnostic, sans valeurs). */
export function resendRelatedEnvKeyNames(): string[] {
  return Object.keys(process.env).filter((k) => k.toUpperCase().includes("RESEND"));
}

/** Message utilisateur quand la clé n'est pas visible sur CE déploiement (souvent Vercel ≠ .env.local). */
export function resendApiKeyMissingUserMessage(): string {
  const onVercel = process.env.VERCEL === "1";
  if (onVercel) {
    return (
      "RESEND_API_KEY absente pour ce déploiement serveur. " +
      "Sur waevon.com, seul le tableau Vercel compte : Settings → Environment Variables → nom exact RESEND_API_KEY, " +
      "coche Production (domaine principal), enregistre, puis Deployments → … → Redeploy. " +
      "Un déploiement créé avant l’ajout de la variable n’a pas la clé."
    );
  }
  return (
    "RESEND_API_KEY absente côté serveur. " +
    "Vérifie .env.local à la racine du repo (nom exact RESEND_API_KEY), puis arrête et relance `npm run dev`."
  );
}

// Initialisation lazy : évite le throw à l'évaluation du module si la clé est absente.
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
