import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { ContestAdmin, type ContestSettings, type ContestParticipant } from "./ContestAdmin";

export default async function AdminContestPage() {
  const supabase = await createServerComponentSupabase();
  const [settingsRes, profilesRes] = await Promise.all([
    supabase
      .from("contest_settings")
      .select(
        "id, prize_title, prize_description, prize_value_chf, starts_at, ends_at, is_active, rules_url, tie_break_rules"
      )
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "id, username, email, total_points, consent_marketing_app, consent_partner_offers, consent_created_at"
      )
      .order("total_points", { ascending: false })
      .limit(1000),
  ]);

  const settings = settingsRes.data as ContestSettings | null;
  const participants = (profilesRes.data ?? []) as ContestParticipant[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Concours global</h1>
        <p className="mt-2 text-sm text-white/55">
          Le concours est basé sur le classement final de la ligue générale. Lot, règles
          de départage et sélection manuelle en cas d&apos;égalité parfaite.
        </p>
      </header>
      <div className={`${ui.glassCard} p-6`}>
        <ContestAdmin settings={settings} participants={participants} />
      </div>
    </div>
  );
}
