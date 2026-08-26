export const INVITE_COOKIE = "wo_invite_token";
export const INVITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function isInviteToken(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{16,128}$/.test(value));
}

export function invitePath(token: string): string {
  return `/invite/${encodeURIComponent(token)}`;
}

export function inviteTokenFromPath(pathname: string): string | null {
  const path = pathname.split("?")[0] ?? "";
  const match = path.match(/^\/invite\/([^/]+)$/);
  if (!match) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return isInviteToken(token) ? token : null;
  } catch {
    return null;
  }
}

export function safeInternalPath(raw: string | null | undefined, fallback = "/home"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

export const inviteCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: INVITE_COOKIE_MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};
