export type FootballConfig = {
  provider: string;
  apiKey: string | null;
  baseUrl: string;
  competitionId: string | null;
  /** season (fixtureSeasons) ou league (fixtureLeagues) */
  competitionFilter: "season" | "league";
};

export function getFootballConfig(): FootballConfig {
  const provider = (process.env.FOOTBALL_API_PROVIDER ?? "sportmonks").toLowerCase();
  const filterRaw = (process.env.FOOTBALL_COMPETITION_FILTER ?? "season").toLowerCase();
  const competitionFilter: "season" | "league" =
    filterRaw === "league" ? "league" : "season";

  return {
    provider,
    apiKey: process.env.FOOTBALL_API_KEY?.trim() || null,
    baseUrl:
      process.env.FOOTBALL_API_BASE_URL?.trim() ||
      "https://api.sportmonks.com/v3/football",
    competitionId: process.env.FOOTBALL_COMPETITION_ID?.trim() || null,
    competitionFilter,
  };
}

export function isFootballSyncConfigured(): boolean {
  const cfg = getFootballConfig();
  return Boolean(cfg.apiKey && cfg.competitionId);
}
