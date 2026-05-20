import { getFootballConfig, isFootballSyncConfigured } from "@/lib/football/config";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/admin";

export function validateFootballSyncPrerequisites(): string[] {
  const errors: string[] = [];
  const cfg = getFootballConfig();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL manquante.");
  }
  if (!getSupabaseServiceRoleKey()) {
    errors.push(
      "SUPABASE_SERVICE_ROLE_KEY manquante — la sync admin ne peut pas écrire en base."
    );
  }
  if (!cfg.apiKey) {
    errors.push("FOOTBALL_API_KEY manquante.");
  }
  if (!cfg.competitionId) {
    errors.push("FOOTBALL_COMPETITION_ID manquant.");
  }
  if (cfg.baseUrl.match(/\/football\/football/i)) {
    errors.push(
      "FOOTBALL_API_BASE_URL invalide (/football/football) — attendu : https://api.sportmonks.com/v3/football"
    );
  }
  if (!isFootballSyncConfigured()) {
    errors.push("Configuration football incomplète (clé API ou competition ID).");
  }

  return errors;
}
