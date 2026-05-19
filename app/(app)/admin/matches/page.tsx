import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { MatchesAdmin } from "./MatchesAdmin";

export default async function AdminMatchesPage() {
  const supabase = await createServerComponentSupabase();
  const [matchesRes, teamsRes] = await Promise.all([
    supabase
      .from("matches")
      .select("id, kickoff_at, stage, status, home_score, away_score, home_team_id, away_team_id, home:home_team_id(name), away:away_team_id(name)")
      .order("kickoff_at"),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Matchs</h1>
        <p className="mt-2 text-sm text-white/55">
          Ajoute des matchs, entre les scores finaux, l&apos;app recalcule automatiquement les points.
        </p>
      </header>
      <div className={`${ui.glassCard} p-6`}>
        <MatchesAdmin
          matches={(matchesRes.data ?? []) as unknown as Array<{
            id: string;
            kickoff_at: string;
            stage: string;
            status: "scheduled" | "live" | "finished" | "cancelled";
            home_score: number | null;
            away_score: number | null;
            home_team_id: string;
            away_team_id: string;
            home: { name: string | null } | null;
            away: { name: string | null } | null;
          }>}
          teams={(teamsRes.data ?? []) as Array<{ id: string; name: string }>}
        />
      </div>
    </div>
  );
}
