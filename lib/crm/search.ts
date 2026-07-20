/** Normalise une chaîne pour la recherche : minuscules, sans accents, espaces réduits. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrait uniquement les chiffres (ex. téléphone sans espaces). */
export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function hasPhoneDigitQuery(value: string): boolean {
  return extractPhoneDigits(value).length >= 3;
}
