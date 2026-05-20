export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type NormalizedMatch = {
  externalProvider: string;
  externalMatchId: string;
  externalCompetitionId?: string;
  homeTeamExternalId?: string;
  awayTeamExternalId?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCode?: string;
  awayTeamCode?: string;
  kickoffAt: string;
  lockedAt: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  stage?: string;
  groupName?: string;
  venue?: string;
  city?: string;
  country?: string;
  raw: unknown;
};

export type NormalizedTeam = {
  externalProvider: string;
  externalTeamId: string;
  name: string;
  countryCode?: string;
  raw: unknown;
};

export type FootballSyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  logId?: string;
  matchesImported: number;
  matchesUpdated: number;
  scoresUpdated: number;
  pointsRecalculated: number;
  matchIdsRecalculated: string[];
  error?: string;
};
