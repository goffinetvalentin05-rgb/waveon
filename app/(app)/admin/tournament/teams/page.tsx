import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { TeamsAdmin, type AdminTeam } from "./TeamsAdmin";

export default async function AdminTeamsPage() {
  const supabase = await createServerComponentSupabase();
  const [teamsRes, groupsRes] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, country_code, flag_emoji, group_name, display_order, is_active, is_outsider")
      .order("group_name", { ascending: true })
      .order("display_order", { ascending: true }),
    supabase.from("groups").select("name").order("display_order"),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Équipes</h1>
        <p className="mt-2 text-sm text-white/55">
          Gère les 48 équipes du tournoi mondial. Marque une équipe comme &laquo; outsider &raquo;
          pour activer la carte « Outsider » qui donne un bonus à ceux qui pronostiquent sa victoire.
        </p>
      </header>
      <div className={`${ui.glassCard} p-6`}>
        <TeamsAdmin
          teams={(teamsRes.data ?? []) as AdminTeam[]}
          groups={(groupsRes.data ?? []) as { name: string }[]}
        />
      </div>
    </div>
  );
}
