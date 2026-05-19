import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { Avatar } from "@/components/app/Avatar";
import { ui } from "@/lib/design/tokens";

export default async function LeagueLeaderboardPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, slug, name, kind, max_players")
    .eq("slug", slug)
    .maybeSingle();
  if (!league) notFound();

  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, role, points, profiles:user_id(username, avatar_color)")
    .eq("league_id", league.id)
    .order("points", { ascending: false });

  type Row = {
    user_id: string;
    role: string;
    points: number;
    profiles: { username: string | null; avatar_color: string | null } | null;
  };
  const rows = (members ?? []) as unknown as Row[];
  const myRank = rows.findIndex((m) => m.user_id === user?.id);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
          {league.kind === "global" ? "Ligue générale" : "Ligue privée"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          {league.name} · classement
        </h1>
        <p className="mt-2 text-sm text-white/55">
          {rows.length} membre{rows.length > 1 ? "s" : ""} sur {league.max_players} maximum.
          {myRank >= 0 ? ` Tu es ${myRank + 1}ᵉ avec ${rows[myRank].points} pts.` : null}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link href={`/leagues/${slug}`} className={ui.btnGhost}>
          ← Retour à la ligue
        </Link>
      </div>

      <ol className={`${ui.glassCard} divide-y divide-white/5 overflow-hidden`}>
        {rows.length === 0 ? (
          <li className="px-6 py-8 text-center text-sm text-white/55">
            Pas encore de membres dans cette ligue.
          </li>
        ) : (
          rows.map((m, idx) => (
            <li
              key={m.user_id}
              className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-6 ${
                m.user_id === user?.id ? "bg-blue-500/10" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${
                    idx === 0
                      ? "bg-yellow-400 text-black"
                      : idx === 1
                        ? "bg-slate-300 text-black"
                        : idx === 2
                          ? "bg-amber-700 text-white"
                          : "bg-white/10 text-white/70"
                  }`}
                >
                  {idx + 1}
                </span>
                <Avatar username={m.profiles?.username ?? null} colorId={m.profiles?.avatar_color ?? null} size="sm" />
                <span className="text-sm font-semibold text-white">
                  {m.profiles?.username ?? "—"}
                  {m.user_id === user?.id ? (
                    <span className="ml-2 text-[10px] uppercase text-blue-200">moi</span>
                  ) : null}
                  {m.role === "owner" ? (
                    <span className="ml-2 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200">
                      owner
                    </span>
                  ) : null}
                </span>
              </div>
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white">
                {m.points} pts
              </span>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
