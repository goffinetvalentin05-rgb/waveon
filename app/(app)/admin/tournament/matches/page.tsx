import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { isFootballSyncConfigured } from "@/lib/football/config";
import { ui } from "@/lib/design/tokens";
import { FootballSyncPanel, type SyncLogRow } from "./FootballSyncPanel";
import { MatchesAdmin, type AdminMatch, type AdminTeamLite } from "./MatchesAdmin";

export default async function AdminMatchesPage() {
  const supabase = await createServerComponentSupabase();
  const [matchesRes, teamsRes, groupsRes, syncLogsRes, matchesCountRes] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, match_number, stage, group_name, venue, city, country, kickoff_at, locked_at, status, home_score, away_score, home_placeholder, away_placeholder, external_api_provider, external_match_id, last_synced_at, score_last_synced_at, home:home_team_id(id, name, country_code, flag_emoji), away:away_team_id(id, name, country_code, flag_emoji)"
        )
        .order("kickoff_at"),
      supabase
        .from("teams")
        .select("id, name, country_code, flag_emoji, group_name")
        .order("group_name", { ascending: true })
        .order("display_order", { ascending: true }),
      supabase.from("groups").select("name").order("display_order"),
      supabase
        .from("sync_logs")
        .select(
          "id, provider, sync_type, status, started_at, finished_at, matches_imported, matches_updated, scores_updated, points_recalculated, error_message, raw_summary"
        )
        .order("started_at", { ascending: false })
        .limit(10),
      supabase.from("matches").select("id", { count: "exact", head: true }),
    ]);

  const matches = (matchesRes.data ?? []) as unknown as AdminMatch[];
  const teams = (teamsRes.data ?? []) as AdminTeamLite[];
  const groups = (groupsRes.data ?? []) as { name: string }[];
  const syncLogs = (syncLogsRes.data ?? []) as SyncLogRow[];
  const lastSync = syncLogs[0] ?? null;
  const matchesCount = matchesCountRes.count ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">
          Administration des matchs
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Synchronisation Sportmonks, gestion manuelle et import CSV.{" "}
          <span className="text-white/80 font-medium">
            {matchesCount} match{matchesCount !== 1 ? "s" : ""} en base
          </span>
          .
        </p>
      </header>
      <div className={`${ui.glassCard} p-6 space-y-8`}>
        <FootballSyncPanel
          lastSync={lastSync}
          recentLogs={syncLogs}
          apiConfigured={isFootballSyncConfigured()}
          matchesCount={matchesCount}
        />
        <MatchesAdmin matches={matches} teams={teams} groups={groups} />
      </div>
    </div>
  );
}
