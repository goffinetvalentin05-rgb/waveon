import type { NormalizedMatch } from "@/lib/football/types";
import { getFootballConfig } from "@/lib/football/config";
import { fetchSportmonksFixtures } from "@/lib/football/providers/sportmonks";

export type FootballProvider = {
  name: string;
  fetchCompetitionMatches(): Promise<NormalizedMatch[]>;
};

export function createFootballProvider(): FootballProvider {
  const cfg = getFootballConfig();
  switch (cfg.provider) {
    case "sportmonks":
      return {
        name: "sportmonks",
        fetchCompetitionMatches: () => fetchSportmonksFixtures(cfg),
      };
    default:
      throw new Error(`Provider football inconnu : ${cfg.provider}`);
  }
}
