import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { Avatar } from "@/components/app/Avatar";
import { AppSecondaryPage } from "@/components/pronoclash/AppSecondaryPage";
import { fetchAppShellProfile } from "@/lib/pronoclash/app-shell-profile";

export default async function LeagueLeaderboardPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  const shell = await fetchAppShellProfile();

  return (
    <AppSecondaryPage
      pageTitle={`${league.name} · classement`}
      username={shell.username}
      email={shell.email}
      isAdmin={shell.isAdmin}
    >
      <p className="pc-eyebrow">
        {league.kind === "global" ? "Ligue générale" : "Ligue privée"}
      </p>
      <p className="pc-body-text" style={{ marginTop: 0 }}>
        {rows.length} membre{rows.length > 1 ? "s" : ""} sur {league.max_players} maximum.
        {myRank >= 0 ? ` Tu es ${myRank + 1}ᵉ avec ${rows[myRank].points} pts.` : null}
      </p>

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <Link href={`/leagues/${slug}`} className="pc-btn ghost sm">
          ← Retour à la ligue
        </Link>
      </div>

      <ol className="pc-glass pc-glass-glow-violet overflow-hidden">
        {rows.length === 0 ? (
          <li className="px-6 py-8 text-center text-sm" style={{ color: "var(--pc-muted)" }}>
            Pas encore de membres dans cette ligue.
          </li>
        ) : (
          rows.map((m, idx) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
              style={{
                borderTop: idx > 0 ? "1px solid var(--pc-border)" : undefined,
                background:
                  m.user_id === user?.id
                    ? "linear-gradient(90deg, rgba(99,102,241,0.12), transparent)"
                    : undefined,
              }}
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
                <Avatar
                  username={m.profiles?.username ?? null}
                  colorId={m.profiles?.avatar_color ?? null}
                  size="sm"
                />
                <span className="text-sm font-semibold text-white">
                  {m.profiles?.username ?? "—"}
                  {m.user_id === user?.id ? (
                    <span className="ml-2 text-[10px] uppercase text-violet-300">moi</span>
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
    </AppSecondaryPage>
  );
}
