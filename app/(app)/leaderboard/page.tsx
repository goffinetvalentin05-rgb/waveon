import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { Avatar } from "@/components/app/Avatar";
import { ui } from "@/lib/design/tokens";

export default async function LeaderboardPage() {
  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("profiles")
    .select("id, username, avatar_color, total_points")
    .not("username", "is", null)
    .order("total_points", { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    username: string | null;
    avatar_color: string | null;
    total_points: number;
  };
  const top = (rows ?? []) as Row[];
  const myRank = top.findIndex((r) => r.id === user?.id);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
          Classement global
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          Le top 100
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Cumul de tous les pronostics dans la ligue globale.
          {myRank >= 0
            ? ` Tu es ${myRank + 1}ᵉ avec ${top[myRank].total_points} pts.`
            : null}
        </p>
      </header>

      {top.length === 0 ? (
        <div className={`${ui.glassCard} p-8 text-center text-sm text-white/55`}>
          Pas encore de classement. Lance les premiers pronostics !
        </div>
      ) : (
        <ol className={`${ui.glassCard} divide-y divide-white/5 overflow-hidden`}>
          {top.map((r, idx) => (
            <li
              key={r.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-6 ${
                r.id === user?.id ? "bg-blue-500/10" : ""
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
                <Avatar username={r.username} colorId={r.avatar_color} size="sm" />
                <span className="text-sm font-semibold text-white">
                  {r.username ?? "—"}
                  {r.id === user?.id ? (
                    <span className="ml-2 text-[10px] uppercase text-blue-200">moi</span>
                  ) : null}
                </span>
              </div>
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white">
                {r.total_points} pts
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
