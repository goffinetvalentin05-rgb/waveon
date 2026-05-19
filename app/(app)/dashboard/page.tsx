import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { Avatar } from "@/components/app/Avatar";
import { ui } from "@/lib/design/tokens";

export default async function DashboardPage() {
  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, leaguesRes, pendingOwnedRes, upcomingRes, contestRes, recentPredsRes] =
    await Promise.all([
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
      .from("leagues")
      .select("id, slug, name, kind, plan, status, max_players")
      .eq("owner_id", user.id)
      .in("status", ["pending_payment", "cancelled"]),
    supabase
      .from("matches")
      .select(
        "id, match_number, kickoff_at, status, stage, group_name, home:home_team_id(name, flag_emoji), away:away_team_id(name, flag_emoji)"
      )
      .eq("status", "scheduled")
      .gt("kickoff_at", new Date().toISOString())
      .order("kickoff_at")
      .limit(5),
    supabase
      .from("contest_settings")
      .select("prize_title, prize_value_chf, ends_at, is_active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("predictions")
      .select(
        "id, predicted_home_score, predicted_away_score, points, updated_at, match:match_id(home:home_team_id(name, flag_emoji), away:away_team_id(name, flag_emoji))"
      )
      .eq("user_id", user.id)
      .is("league_id", null)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const profile = profileRes.data;
  const leagues = (leaguesRes.data ?? []) as unknown as Array<{
    role: string;
    points: number;
    leagues: { id: string; slug: string; name: string; kind: string; max_players: number } | null;
  }>;

  type MatchRow = {
    id: string;
    match_number: number | null;
    kickoff_at: string;
    status: string;
    stage: string;
    group_name: string | null;
    home: { name: string | null; flag_emoji: string | null } | null;
    away: { name: string | null; flag_emoji: string | null } | null;
  };
  const upcoming = (upcomingRes.data ?? []) as unknown as MatchRow[];

  type RecentPred = {
    id: string;
    predicted_home_score: number;
    predicted_away_score: number;
    points: number;
    updated_at: string;
    match: {
      home: { name: string | null; flag_emoji: string | null } | null;
      away: { name: string | null; flag_emoji: string | null } | null;
    } | null;
  };
  const recentPreds = (recentPredsRes.data ?? []) as unknown as RecentPred[];

  const cs = contestRes.data as
    | { prize_title: string; prize_value_chf: number; ends_at: string | null; is_active: boolean }
    | null;

  // Rang global (nombre de joueurs strictement devant + 1)
  const { count: aheadCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gt("total_points", profile?.total_points ?? 0);
  const rank = (aheadCount ?? 0) + 1;

  const ownsAnyLeague = leagues.some((l) => l.role === "owner");
  const pendingOwned = (pendingOwnedRes.data ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    kind: string;
    plan: string | null;
    status: string;
    max_players: number;
  }>;

  const privateLeagues = leagues.filter((l) => l.leagues?.kind !== "global");

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
              <p className="mt-1 text-sm text-white/55">
                Bienvenue dans ton QG Prono Clash · Tournoi mondial 2026.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Kpi label="Points" value={profile?.total_points ?? 0} accent="from-blue-500 to-indigo-500" />
            <Kpi label="Rang général" value={`#${rank}`} accent="from-violet-500 to-fuchsia-500" />
          </div>
        </div>
      </section>

      {/* Statut concours */}
      <section className={`${ui.glowCard} relative overflow-hidden p-5 sm:p-6`}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-200/80">
              Concours gratuit
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Tu participes gratuitement au classement général.
            </p>
            <p className="mt-1 text-xs text-white/55">
              {cs
                ? `Lot pour le n°1 : ${cs.prize_title} (valeur max CHF ${cs.prize_value_chf}).`
                : "Lot pour le premier du classement à la fin du tournoi."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/global/leaderboard" className={ui.btnSecondary}>
              Classement
            </Link>
            <Link href="/matches" className={ui.btnPrimary}>
              Pronostiquer
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mes ligues */}
        <section className={`${ui.glassCard} p-6 lg:col-span-2`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Mes ligues</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/leagues/new" className={ui.btnPrimary}>
                + Créer une ligue privée
              </Link>
              <Link href="/leagues/join" className={ui.btnSecondary}>
                Rejoindre une ligue
              </Link>
            </div>
          </div>
          <ul className="space-y-2">
            {leagues.map((m, i) => (
              <li
                key={`${m.leagues?.id ?? "x"}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">
                      {m.leagues?.name ?? "—"}
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                      {m.leagues?.kind === "global"
                        ? "générale"
                        : m.leagues?.kind === "pro"
                          ? "pro"
                          : "privée"}
                    </span>
                    {m.role === "owner" ? (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">
                        owner
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-white/50">{m.points} pts</p>
                </div>
                {m.leagues?.slug ? (
                  <Link
                    href={
                      m.leagues.kind === "global"
                        ? "/global"
                        : `/leagues/${m.leagues.slug}`
                    }
                    className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                  >
                    Ouvrir →
                  </Link>
                ) : null}
              </li>
            ))}
            {pendingOwned.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-3"
              >
                <div className="min-w-0">
                  <span className="truncate text-sm font-semibold text-white">{l.name}</span>
                  <p className="text-xs text-amber-200/80">
                    Paiement en attente · {l.plan === "pro" ? "Pro" : "Private"} League
                  </p>
                </div>
                <Link
                  href={`/leagues/checkout/cancelled?league_id=${l.id}`}
                  className="shrink-0 text-xs font-medium text-amber-200 hover:text-amber-100"
                >
                  Payer →
                </Link>
              </li>
            ))}
          </ul>
          {privateLeagues.length === 0 && pendingOwned.length === 0 ? (
            <p className="mt-4 text-xs text-white/50">
              Tu n&apos;es pas encore dans une ligue privée. Crée la tienne pour jouer
              avec des cartes et saboter tes potes.
            </p>
          ) : null}
          {ownsAnyLeague ? (
            <p className="mt-4 text-xs text-white/40">
              Astuce : partage ton lien d&apos;invitation WhatsApp depuis la page de ta ligue.
            </p>
          ) : null}
        </section>

        {/* Statut & shortcuts */}
        <section className={`${ui.glassCard} p-6`}>
          <h2 className="text-lg font-semibold text-white">Raccourcis</h2>
          <div className="mt-3 space-y-2 text-sm">
            <ShortcutLink href="/matches" label="Pronostiquer les prochains matchs" />
            <ShortcutLink href="/global/leaderboard" label="Classement général" />
            <ShortcutLink href="/leagues/new" label="Créer une ligue privée" />
            <ShortcutLink href="/leagues/join" label="Rejoindre une ligue (code)" />
            <ShortcutLink href="/legal/contest-rules" label="Règlement du concours" />
          </div>
        </section>
      </div>

      {/* Pronostics récents */}
      {recentPreds.length > 0 ? (
        <section className={`${ui.glassCard} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Mes pronostics récents</h2>
            <Link href="/matches" className="text-xs font-medium text-blue-300 hover:text-blue-200">
              Tout voir →
            </Link>
          </div>
          <ul className="space-y-2">
            {recentPreds.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <span className="truncate text-sm text-white">
                  {p.match?.home?.flag_emoji} {p.match?.home?.name ?? "—"} {p.predicted_home_score}-
                  {p.predicted_away_score} {p.match?.away?.name ?? "—"} {p.match?.away?.flag_emoji}
                </span>
                <span className="shrink-0 text-xs font-bold text-white/70">{p.points} pts</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Prochains matchs */}
      <section className={`${ui.glassCard} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Prochains matchs</h2>
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
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>
                    {new Date(m.kickoff_at).toLocaleString("fr-CH", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {m.group_name ? (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">
                      G {m.group_name}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-white">
                    <span>{m.home?.flag_emoji ?? "🏳️"}</span>
                    <span className="truncate">{m.home?.name ?? "—"}</span>
                  </span>
                  <span className="text-xs text-white/40">vs</span>
                  <span className="flex items-center gap-2 font-semibold text-white">
                    <span className="truncate">{m.away?.name ?? "—"}</span>
                    <span>{m.away?.flag_emoji ?? "🏳️"}</span>
                  </span>
                </div>
                <Link
                  href="/matches"
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
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-30 blur-2xl`} />
      <p className="text-xs uppercase tracking-widest text-white/45">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function ShortcutLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/5"
    >
      <span className="text-sm text-white/85">{label}</span>
      <span className="text-white/40">→</span>
    </Link>
  );
}
