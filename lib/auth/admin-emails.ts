import type { User } from "@supabase/supabase-js";

export function getAdminEmailsFromEnv(): string[] {
  const raw = (process.env.ADMIN_EMAILS ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/[,;]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeAuthEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const e = normalizeAuthEmail(email);
  if (!e) return false;
  const admins = getAdminEmailsFromEnv();
  return admins.includes(e);
}

function collectCandidateEmailsFromUser(user: User): string[] {
  const out: string[] = [];

  const push = (v: unknown) => {
    if (typeof v !== "string") return;
    const e = normalizeAuthEmail(v);
    if (e) out.push(e);
  };

  push(user.email);

  const meta = user.user_metadata as Record<string, unknown> | null | undefined;
  if (meta) {
    push(meta.email);
    push(meta.primary_email);
    push(meta.secondary_email);
    // Google OAuth (souvent présent)
    push((meta as { user_name?: unknown }).user_name);
  }

  const identities = user.identities ?? [];
  for (const id of identities) {
    const idMeta = (id?.identity_data ?? null) as Record<string, unknown> | null;
    if (idMeta) {
      push(idMeta.email);
      push(idMeta.primary_email);
    }
  }

  return Array.from(new Set(out));
}

/**
 * Détection admin robuste côté serveur : certains comptes n’ont pas `user.email`
 * rempli comme attendu selon le provider, mais l’email existe dans metadata/identities.
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const admins = getAdminEmailsFromEnv();
  if (!admins.length) return false;
  const candidates = collectCandidateEmailsFromUser(user);
  return candidates.some((e) => admins.includes(e));
}

export function adminAccessDebugEnabled(): boolean {
  return (process.env.ADMIN_ACCESS_DEBUG ?? "").trim() === "1";
}

