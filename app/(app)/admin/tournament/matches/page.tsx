import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { MatchesAdmin, type AdminMatch, type AdminTeamLite } from "./MatchesAdmin";

export default async function AdminMatchesPage() {
  const supabase = await createServerComponentSupabase();
  const [matchesRes, teamsRes, groupsRes] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, match_number, stage, group_name, venue, city, country, kickoff_at, locked_at, status, home_score, away_score, home_placeholder, away_placeholder, home:home_team_id(id, name, country_code, flag_emoji), away:away_team_id(id, name, country_code, flag_emoji)"
      )
      .order("kickoff_at"),
    supabase
      .from("teams")
      .select("id, name, country_code, flag_emoji, group_name")
      .order("group_name", { ascending: true })
      .order("display_order", { ascending: true }),
    supabase.from("groups").select("name").order("display_order"),
  ]);

  const matches = (matchesRes.data ?? []) as unknown as AdminMatch[];
  const teams = (teamsRes.data ?? []) as AdminTeamLite[];
  const groups = (groupsRes.data ?? []) as { name: string }[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Matchs</h1>
        <p className="mt-2 text-sm text-white/55">
          Ajoute manuellement, importe via CSV, saisis les scores et déclenche le recalcul des points.
        </p>
      </header>
      <div className={`${ui.glassCard} p-6`}>
        <MatchesAdmin matches={matches} teams={teams} groups={groups} />
      </div>
    </div>
  );
}
