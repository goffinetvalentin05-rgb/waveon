import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { PlayersAdmin } from "./PlayersAdmin";

export default async function AdminPlayersPage() {
  const supabase = await createServerComponentSupabase();
  const [playersRes, teamsRes] = await Promise.all([
    supabase
      .from("players")
      .select("id, full_name, position, goals_scored, team:team_id(id, name)")
      .order("full_name"),
    supabase.from("teams").select("id, name").order("name"),
  ]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Joueurs</h1>
        <p className="mt-2 text-sm text-white/55">
          Référence les joueurs pour le concours du meilleur buteur.
        </p>
      </header>
      <div className={`${ui.glassCard} p-6`}>
        <PlayersAdmin
          players={(playersRes.data ?? []) as unknown as Array<{
            id: string;
            full_name: string;
            position: string | null;
            goals_scored: number;
            team: { id: string; name: string | null } | null;
          }>}
          teams={(teamsRes.data ?? []) as Array<{ id: string; name: string }>}
        />
      </div>
    </div>
  );
}
