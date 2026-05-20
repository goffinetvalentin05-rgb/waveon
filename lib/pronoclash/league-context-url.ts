/** Contexte pronostic : `null` = ligue générale (predictions.league_id IS NULL). */
export type LeagueContextId = string | null;

export function leagueContextToParam(leagueId: LeagueContextId): string {
  return leagueId ?? "global";
}

export function leagueContextFromParam(param: string | null | undefined): LeagueContextId {
  if (!param || param === "global") return null;
  return param;
}

export function matchesPageHref(leagueId: LeagueContextId): string {
  return `/matches?league=${leagueContextToParam(leagueId)}`;
}

export function predictionMapKey(matchId: string, leagueId: LeagueContextId): string {
  return `${matchId}::${leagueId ?? "global"}`;
}
