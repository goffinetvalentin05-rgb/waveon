/** Routes qui utilisent PronoClashShell (sans header AppShell classique). */
export function isPronoClashShellPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/dashboard") return true;
  if (pathname === "/matches" || pathname.startsWith("/matches/")) return true;
  if (pathname === "/leaderboard" || pathname === "/global/leaderboard") return true;
  if (pathname === "/leagues/new") return true;
  return false;
}
