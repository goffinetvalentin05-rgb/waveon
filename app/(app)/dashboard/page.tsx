import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { Avatar } from "@/components/app/Avatar";
import { ui } from "@/lib/design/tokens";

export default async function DashboardPage() {
  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, leaguesRes, tpRes, upcomingRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_color, total_points")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("league_members")
      .select("role, points, leagues(id, slug, name, kind, max_players)")
      .eq("user_id", user.id),
    supabase
      .from("tournament_predictions")
      .select("champion_team_id, top_scorer_id, locked, teams:champion_team_id(name), players:top_scorer_id(full_name)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("id, kickoff_at, status, home:home_team_id(name, short_code), away:away_team_id(name, short_code)")
      .eq("status", "scheduled")
      .gt("kickoff_at", new Date().toISOString())
      .order("kickoff_at")
      .limit(5),
  ]);

  const profile = profileRes.data;
  const leagues = (leaguesRes.data ?? []) as unknown as Array<{
    role: string;
    points: number;
    leagues: { id: string; slug: string; name: string; kind: string; max_players: number } | null;
  }>;

  type TeamRef = { name: string | null } | null;
  type PlayerRef = { full_name: string | null } | null;
  type TpRow = {
    champion_team_id: string | null;
    top_scorer_id: string | null;
    locked: boolean | null;
    teams: TeamRef;
    players: PlayerRef;
  } | null;
  const tp = tpRes.data as TpRow;

  type MatchRow = {
    id: string;
    kickoff_at: string;
    status: string;
    home: { name: string | null; short_code: string | null } | null;
    away: { name: string | null; short_code: string | null } | null;
  };
  const upcoming = (upcomingRes.data ?? []) as unknown as MatchRow[];

  // Classement global de l'utilisateur
  const { data: rankRows } = await supabase
    .from("profiles")
    .select("id, total_points")
    .gt("total_points", profile?.total_points ?? 0);
  const rank = (rankRows?.length ?? 0) + 1;

  const ownsAnyLeague = leagues.some((l) => l.role === "owner");

  return (
    <div className="space-y-6">
      <section className={`${ui.glassCard} relative overflow-hidden p-6 sm:p-8`}>
        <div className="pc-aurora opacity-50" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar username={profile?.username} colorId={profile?.avatar_color} size="lg" />
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">Salut</p>
              <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                {profile?.username ?? "Joueur"}
              </h1>
              <p className="mt-1 text-sm text-white/55">Bienvenue dans ton QG Prono Clash.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Kpi label="Points" value={profile?.total_points ?? 0} accent="from-blue-500 to-indigo-500" />
            <Kpi label="Rang global" value={`#${rank}`} accent="from-violet-500 to-fuchsia-500" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mes ligues */}
        <section className={`${ui.glassCard} p-6 lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Mes ligues</h2>
            <Link href="/leagues/new" className={ui.btnSecondary}>
              + Créer une ligue
            </Link>
          </div>
          {leagues.length === 0 ? (
            <EmptyLeagues />
          ) : (
            <ul className="space-y-2">
              {leagues.map((m, i) => (
                <li
                  key={`${m.leagues?.id ?? "x"}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {m.leagues?.name ?? "—"}
                      </span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                        {m.leagues?.kind === "global" ? "globale" : m.leagues?.kind === "private" ? "privée" : m.leagues?.kind === "pro" ? "pro" : "—"}
                      </span>
                      {m.role === "owner" ? (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">
                          owner
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-white/50">{m.points} pts dans cette ligue</p>
                  </div>
                  {m.leagues?.slug ? (
                    <Link
                      href={`/leagues/${m.leagues.slug}`}
                      className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                    >
                      Ouvrir →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {ownsAnyLeague ? (
            <p className="mt-4 text-xs text-white/40">
              Astuce : partage ton lien d&apos;invitation WhatsApp depuis la page de ta ligue.
            </p>
          ) : null}
        </section>

        {/* Prédictions */}
        <section className={`${ui.glassCard} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Mes prédictions finales</h2>
            {tp?.locked ? <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-200">verrouillées</span> : null}
          </div>
          <div className="space-y-3 text-sm">
            <PredictionRow label="Champion" value={tp?.teams?.name ?? "—"} />
            <PredictionRow label="Meilleur buteur" value={tp?.players?.full_name ?? "—"} />
          </div>
          {!tp?.locked ? (
            <Link href="/onboarding" className={`${ui.btnGhost} mt-4 w-full justify-center`}>
              Modifier
            </Link>
          ) : null}
        </section>
      </div>

      {/* Prochains matchs */}
      <section className={`${ui.glassCard} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Prochains matchs à pronostiquer</h2>
          <Link href="/matches" className="text-xs font-medium text-blue-300 hover:text-blue-200">
            Tout voir →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">
            Aucun match programmé pour le moment. Reviens un peu plus tard.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20"
              >
                <div className="text-xs text-white/40">
                  {new Date(m.kickoff_at).toLocaleString("fr-CH", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-white">{m.home?.name ?? "—"}</span>
                  <span className="text-xs text-white/40">vs</span>
                  <span className="font-semibold text-white">{m.away?.name ?? "—"}</span>
                </div>
                <Link
                  href={`/matches?focus=${m.id}`}
                  className="mt-3 inline-flex items-center text-xs font-semibold text-blue-300 hover:text-blue-200"
                >
                  Pronostiquer →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl`}>
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-30 blur-2xl`} />
      <p className="text-xs uppercase tracking-widest text-white/45">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function PredictionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <span className="text-xs uppercase tracking-widest text-white/40">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function EmptyLeagues() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
      <p className="text-sm text-white/65">
        Tu n&apos;es pas encore dans une ligue privée. Rejoins-en une avec un lien
        d&apos;invitation, ou crée la tienne.
      </p>
      <Link href="/leagues/new" className={`${ui.btnPrimary} mt-4`}>
        Créer une ligue privée
      </Link>
    </div>
  );
}
