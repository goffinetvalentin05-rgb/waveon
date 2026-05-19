import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { TeamsAdmin } from "./TeamsAdmin";

export default async function AdminTeamsPage() {
  const supabase = await createServerComponentSupabase();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_code, color, group_label, is_outsider")
    .order("name");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Équipes</h1>
        <p className="mt-2 text-sm text-white/55">
          Ajoute, renomme, supprime, ou marque des équipes comme &laquo; outsider &raquo;.
        </p>
      </header>
      <div className={`${ui.glassCard} p-6`}>
        <TeamsAdmin
          teams={(teams ?? []) as Array<{
            id: string;
            name: string;
            short_code: string | null;
            color: string | null;
            group_label: string | null;
            is_outsider: boolean;
          }>}
        />
      </div>
    </div>
  );
}
