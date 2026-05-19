import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

export default async function AdminHomePage() {
  const supabase = await createServerComponentSupabase();

  const [teamsCount, matchesCount, leaguesCount, usersCount, paymentsCount, contestSettings] =
    await Promise.all([
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("matches").select("id", { count: "exact", head: true }),
      supabase.from("leagues").select("id", { count: "exact", head: true }).neq("kind", "global"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid"),
      supabase
        .from("contest_settings")
        .select("prize_title, prize_value_chf, ends_at, is_active")
        .limit(1)
        .maybeSingle(),
    ]);

  const cs = contestSettings.data as
    | { prize_title: string; prize_value_chf: number; ends_at: string | null; is_active: boolean }
    | null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Espace admin</h1>
        <p className="mt-2 text-sm text-white/55">
          Tournoi, équipes, matchs, scores, concours, ligues privées et paiements.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Joueurs inscrits" value={usersCount.count ?? 0} link="/admin/contest" />
        <Kpi label="Équipes" value={teamsCount.count ?? 0} link="/admin/tournament/teams" />
        <Kpi label="Matchs" value={matchesCount.count ?? 0} link="/admin/tournament/matches" />
        <Kpi label="Ligues privées" value={leaguesCount.count ?? 0} link="/admin/leagues" />
        <Kpi label="Paiements payés" value={paymentsCount.count ?? 0} link="/admin/payments" />
      </div>

      <section className={`${ui.glassCard} p-6`}>
        <h2 className="text-lg font-semibold text-white">Concours global</h2>
        {cs ? (
          <>
            <p className="mt-2 text-sm text-white/55">
              Lot : <span className="text-white">{cs.prize_title}</span> · valeur max{" "}
              <span className="text-white">CHF {cs.prize_value_chf}</span>
              {cs.ends_at
                ? ` · clôture le ${new Date(cs.ends_at).toLocaleDateString("fr-CH")}`
                : ""}
              {" · "}
              {cs.is_active ? (
                <span className="text-emerald-300">actif</span>
              ) : (
                <span className="text-amber-300">en pause</span>
              )}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/55">Paramètres non initialisés.</p>
        )}
        <Link href="/admin/contest" className={`${ui.btnSecondary} mt-4`}>
          Gérer le concours
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
