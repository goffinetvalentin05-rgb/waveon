import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

export default async function AdminHomePage() {
  const supabase = await createServerComponentSupabase();

  const [teamsCount, matchesCount, leaguesCount, contestCount, deadlineRow] = await Promise.all([
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("leagues").select("id", { count: "exact", head: true }).neq("kind", "global"),
    supabase.from("contest_entries").select("id", { count: "exact", head: true }),
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
        <h1 className="font-display text-3xl font-semibold text-white">Espace admin</h1>
        <p className="mt-2 text-sm text-white/55">
          Gère équipes, joueurs, matchs, scores, et règlement du concours.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Équipes" value={teamsCount.count ?? 0} link="/admin/teams" />
        <Kpi label="Matchs" value={matchesCount.count ?? 0} link="/admin/matches" />
        <Kpi label="Ligues privées" value={leaguesCount.count ?? 0} link="/admin/leagues" />
        <Kpi label="Entrées concours" value={contestCount.count ?? 0} link="/admin/contest" />
      </div>

      <section className={`${ui.glassCard} p-6`}>
        <h2 className="text-lg font-semibold text-white">Deadline prédictions champion/buteur</h2>
        <p className="mt-2 text-sm text-white/55">
          Après cette date, plus personne ne peut modifier ses prédictions finales.
        </p>
        <p className="mt-3 text-sm font-semibold text-white">
          Actuelle : {deadlineIso ? new Date(deadlineIso).toLocaleString("fr-CH") : "non définie"}
        </p>
        <Link href="/admin/contest" className={`${ui.btnSecondary} mt-4`}>
          Modifier la deadline
        </Link>
      </section>
    </div>
  );
}

function Kpi({ label, value, link }: { label: string; value: number; link: string }) {
  return (
    <Link
      href={link}
      className={`${ui.glassCard} block p-5 transition hover:-translate-y-1`}
    >
      <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-white">{value}</p>
    </Link>
  );
}
