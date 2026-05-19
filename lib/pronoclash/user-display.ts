/** Première lettre d'affichage : username (sans @) ou email. */
export function getAvatarLetter(username?: string | null, email?: string | null): string {
  const fromUser = username?.trim().replace(/^@+/, "") ?? "";
  if (fromUser) return fromUser[0]!.toUpperCase();
  const fromEmail = email?.trim() ?? "";
  if (fromEmail) return fromEmail[0]!.toUpperCase();
  return "?";
}

export function formatUserHandle(username?: string | null): string {
  const raw = username?.trim().replace(/^@+/, "") ?? "";
  if (!raw) return "";
  return `@${raw.toLowerCase().replace(/\s+/g, "")}`;
}
