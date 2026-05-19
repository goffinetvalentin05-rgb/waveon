import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

export default async function AdminTournamentPage() {
  const supabase = await createServerComponentSupabase();

  const [groupsRes, teamsRes, matchesRes] = await Promise.all([
    supabase.from("groups").select("name").order("display_order"),
    supabase
      .from("teams")
      .select("id, name, flag_emoji, country_code, group_name, is_active, is_outsider")
      .order("group_name", { ascending: true })
      .order("display_order", { ascending: true }),
    supabase
      .from("matches")
      .select("id, status, stage, group_name, kickoff_at")
      .order("kickoff_at"),
  ]);

  type Team = {
    id: string;
    name: string;
    flag_emoji: string | null;
    country_code: string | null;
    group_name: string | null;
    is_active: boolean;
    is_outsider: boolean;
  };
  const teams = (teamsRes.data ?? []) as Team[];
  const matches = matchesRes.data ?? [];
  const groups = (groupsRes.data ?? []) as { name: string }[];

  const byGroup = new Map<string, Team[]>();
  for (const t of teams) {
    const k = t.group_name ?? "—";
    if (!byGroup.has(k)) byGroup.set(k, []);
    byGroup.get(k)!.push(t);
  }

  const stats = {
    teams: teams.length,
    matches: matches.length,
    finished: matches.filter((m) => m.status === "finished").length,
    scheduled: matches.filter((m) => m.status === "scheduled").length,
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">
          Tournoi mondial 2026
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Vue d&apos;ensemble des 12 groupes, 48 équipes et de tous les matchs.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Équipes" value={stats.teams} />
        <Stat label="Matchs" value={stats.matches} />
        <Stat label="À jouer" value={stats.scheduled} />
        <Stat label="Terminés" value={stats.finished} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/tournament/teams" className={ui.btnSecondary}>
          Gérer les équipes
        </Link>
        <Link href="/admin/tournament/matches" className={ui.btnPrimary}>
          Gérer les matchs
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/55">
          Phase de groupes
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((g) => {
            const list = byGroup.get(g.name) ?? [];
            return (
              <div key={g.name} className={`${ui.glassCard} p-4`}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-display text-lg font-semibold text-white">
                    Groupe {g.name}
                  </div>
                  <div className="text-[11px] text-white/40">{list.length}/4</div>
                </div>
                <ul className="space-y-1.5">
                  {list.length === 0 ? (
                    <li className="text-xs text-white/40">Aucune équipe</li>
                  ) : (
                    list.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 text-sm text-white/80"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-lg leading-none">{t.flag_emoji ?? "🏳️"}</span>
                          <span className="truncate">{t.name}</span>
                        </span>
                        {t.is_outsider ? (
                          <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200">
                            outsider
                          </span>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${ui.glassCard} p-4`}>
      <div className="text-[10px] uppercase tracking-widest text-white/45">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
