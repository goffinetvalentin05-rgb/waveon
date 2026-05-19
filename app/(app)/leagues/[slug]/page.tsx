import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { getAppBaseUrl } from "@/lib/brand/config";
import { Avatar } from "@/components/app/Avatar";
import { ui } from "@/lib/design/tokens";

type RouteParams = { slug: string };

export default async function LeaguePage(props: { params: Promise<RouteParams> }) {
  const params = await props.params;
  const supabase = await createServerComponentSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("id, slug, name, kind, plan, max_players, owner_id, status, settings, invite_code")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!league) notFound();

  const isOwner = league.owner_id === user.id;
  if (league.status === "pending_payment" || league.status === "cancelled") {
    if (!isOwner) notFound();
    redirect(`/leagues/checkout/cancelled?league_id=${league.id}`);
  }

  // Membres + classement
  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, role, points, profiles:user_id(username, avatar_color)")
    .eq("league_id", league.id)
    .order("points", { ascending: false });

  type Member = {
    user_id: string;
    role: string;
    points: number;
    profiles: { username: string | null; avatar_color: string | null } | null;
  };
  const sortedMembers = (members ?? []) as unknown as Member[];
  const isMember = sortedMembers.some((m) => m.user_id === user.id);
  const isPrivate = league.kind !== "global";
  const baseUrl = getAppBaseUrl();
  const inviteUrl =
    league.invite_code && isPrivate
      ? `${baseUrl}/leagues/join/${league.invite_code}`
      : null;

  return (
    <div className="space-y-6">
      <header className={`${ui.glassCard} relative overflow-hidden p-6 sm:p-8`}>
        <div className="pc-aurora opacity-40" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {league.kind === "global" ? "Ligue globale" : league.kind === "pro" ? "Ligue pro" : "Ligue privée"}
              </span>
              {isOwner ? (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                  owner
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
              {league.name}
            </h1>
            <p className="mt-1 text-sm text-white/55">
              {sortedMembers.length} membre{sortedMembers.length > 1 ? "s" : ""}
              {league.kind !== "global" ? ` · max ${league.max_players}` : ""}
              {league.status === "active" ? " · active" : ""}
            </p>
            {isOwner && league.status === "active" && isPrivate ? (
              <p className="mt-2 text-sm font-medium text-emerald-300/90">
                Ta ligue est prête — invite tes potes pour commencer.
              </p>
            ) : null}
          </div>
          {isPrivate && league.status === "active" ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/leagues/${league.slug}/invite`} className={ui.btnPrimary}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                  <path d="M20.5 3.5A11 11 0 0 0 3.6 17l-1.6 5 5.1-1.5A11 11 0 0 0 20.5 3.5Z"/>
                </svg>
                Inviter sur WhatsApp
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className={`${ui.glassCard} p-6`}>
          <h2 className="text-lg font-semibold text-white">Classement</h2>
          <ul className="mt-4 space-y-2">
            {sortedMembers.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
                Aucun membre pour l&apos;instant.
              </li>
            ) : (
              sortedMembers.map((m, idx) => (
                <li
                  key={m.user_id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    m.user_id === user.id
                      ? "border-blue-400/30 bg-blue-500/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
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
                      username={m.profiles?.username}
                      colorId={m.profiles?.avatar_color}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {m.profiles?.username ?? "—"}
                        {m.user_id === user.id ? (
                          <span className="ml-2 text-[10px] uppercase text-blue-200">moi</span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-white/40">
                        {m.role === "owner" ? "owner" : "membre"}
                      </div>
                    </div>
                  </div>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white">
                    {m.points} pts
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <aside className="space-y-6">
          <section className={`${ui.glassCard} p-6`}>
            <h2 className="text-lg font-semibold text-white">Cartes</h2>
            <p className="mt-2 text-sm text-white/55">
              {isPrivate
                ? "Joue tes cartes depuis la page d'un match. Chaque joueur peut jouer une carte par match."
                : "Les cartes ne sont disponibles que dans les ligues privées."}
            </p>
            {isPrivate ? (
              <Link href={`/matches`} className={`${ui.btnSecondary} mt-4 w-full justify-center`}>
                Voir les matchs
              </Link>
            ) : null}
          </section>

          {isOwner && league.status === "active" && inviteUrl ? (
            <section className={`${ui.glassCard} p-6`}>
              <h2 className="text-lg font-semibold text-white">Invitation</h2>
              <p className="mt-2 text-sm text-white/55">
                Partage ce lien à tes potes pour qu&apos;ils rejoignent la ligue.
              </p>
              <p className="mt-3 break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white/80">
                {inviteUrl}
              </p>
              <Link
                href={`/leagues/${league.slug}/invite`}
                className={`${ui.btnSecondary} mt-4 w-full justify-center`}
              >
                Message WhatsApp
              </Link>
            </section>
          ) : null}

          {isMember ? (
            <section className={`${ui.glassCard} p-6`}>
              <h2 className="text-lg font-semibold text-white">Tu en es</h2>
              <p className="mt-2 text-sm text-white/55">
                Tes pronostics dans cette ligue comptent pour le classement ci-contre.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
