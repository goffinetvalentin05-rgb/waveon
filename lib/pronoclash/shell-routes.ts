/** Routes qui utilisent PronoClashShell (sans header AppShell classique). */
export function isPronoClashShellPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/dashboard") return true;
  if (pathname === "/matches" || pathname.startsWith("/matches/")) return true;
  if (pathname === "/leaderboard" || pathname === "/global/leaderboard") return true;
  if (pathname === "/global" || pathname.startsWith("/global/")) return true;
  if (pathname === "/leagues/new" || pathname.startsWith("/leagues/new/")) return true;
  if (pathname.startsWith("/leagues/checkout")) return true;
  if (pathname === "/leagues/join" || pathname.startsWith("/leagues/join/")) return true;
  if (pathname.startsWith("/leagues/")) return true;
  if (pathname.startsWith("/admin")) return true;
  return false;
}
