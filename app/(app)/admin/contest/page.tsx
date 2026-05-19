import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { ContestAdmin } from "./ContestAdmin";

export default async function AdminContestPage() {
  const supabase = await createServerComponentSupabase();
  const [entriesRes, deadlineRow] = await Promise.all([
    supabase
      .from("contest_entries")
      .select("id, email, created_at, champion_team_id, top_scorer_id, consent_marketing_app, consent_partner_offers, team:champion_team_id(name), player:top_scorer_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "tournament_predictions_deadline")
      .maybeSingle(),
  ]);

  const deadlineIso =
    (deadlineRow.data?.value as { deadline?: string | null } | null)?.deadline ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Concours</h1>
        <p className="mt-2 text-sm text-white/55">
          Deadline des prédictions, liste des participants et leurs consentements.
        </p>
      </header>
      <div className={`${ui.glassCard} p-6`}>
        <ContestAdmin
          deadlineIso={deadlineIso}
          entries={(entriesRes.data ?? []) as unknown as Array<{
            id: string;
            email: string;
            created_at: string;
            champion_team_id: string | null;
            top_scorer_id: string | null;
            consent_marketing_app: boolean;
            consent_partner_offers: boolean;
            team: { name: string | null } | null;
            player: { full_name: string | null } | null;
          }>}
        />
      </div>
    </div>
  );
}
