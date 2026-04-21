/** Slug dans l’URL publique : même colonne DB que `public_slug`. */

export const PUBLIC_SLUG_MIN_LEN = 3;
export const PUBLIC_SLUG_MAX_LEN = 40;

/** Regex : lettres minuscules, chiffres, tirets ; pas de tiret en tête/fin implicite via segments */
export const PUBLIC_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Segments d’URL réservés (routes app / fichiers statiques courants) */
export const RESERVED_PUBLIC_SLUGS = new Set([
  "api",
  "annuler",
  "conditions-d-utilisation",
  "confidentialite",
  "dashboard",
  "login",
  "logout",
  "mockup-export",
  "register",
  "reserver",
  "signup",
  "update-password",
  "_next",
  "favicon.ico",
]);

export function normalizePublicSlugInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isReservedPublicSlug(slug: string): boolean {
  return RESERVED_PUBLIC_SLUGS.has(slug);
}

export type PublicSlugFormatResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export function validatePublicSlugFormat(slug: string): PublicSlugFormatResult {
  const s = slug.trim().toLowerCase();
  if (s.length < PUBLIC_SLUG_MIN_LEN) {
    return { ok: false, error: `Au moins ${PUBLIC_SLUG_MIN_LEN} caractères.` };
  }
  if (s.length > PUBLIC_SLUG_MAX_LEN) {
    return { ok: false, error: `Au plus ${PUBLIC_SLUG_MAX_LEN} caractères.` };
  }
  if (!PUBLIC_SLUG_REGEX.test(s)) {
    return {
      ok: false,
      error: "Lettres minuscules, chiffres et tirets uniquement.",
    };
  }
  if (isReservedPublicSlug(s)) {
    return { ok: false, error: "Cet identifiant est réservé, choisis-en un autre." };
  }
  return { ok: true, slug: s };
}
