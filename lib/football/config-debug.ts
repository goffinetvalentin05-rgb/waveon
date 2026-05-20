import { getFootballConfig } from "@/lib/football/config";

/** Config football pour diagnostic admin — jamais de secrets en clair. */
export function getFootballConfigDebug() {
  const cfg = getFootballConfig();
  return {
    FOOTBALL_API_PROVIDER: cfg.provider || "absent",
    FOOTBALL_API_KEY: cfg.apiKey ? "présent" : "absent",
    FOOTBALL_API_BASE_URL: cfg.baseUrl,
    FOOTBALL_COMPETITION_ID: cfg.competitionId ?? "absent",
    FOOTBALL_COMPETITION_FILTER: cfg.competitionFilter,
    CRON_SECRET: process.env.CRON_SECRET?.trim() ? "présent" : "absent",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      ? "présent"
      : "absent",
    syncReady: Boolean(cfg.apiKey && cfg.competitionId),
  };
}
