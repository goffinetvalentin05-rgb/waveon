import { notFound, redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { CardsClient } from "./CardsClient";

type RouteParams = { slug: string };

export default async function LeagueCardsPage(props: { params: Promise<RouteParams> }) {
  const params = await props.params;
  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("id, slug, name, kind")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!league || league.kind === "global") notFound();

  const [invRes, cardsRes, matchesRes, membersRes] = await Promise.all([
    supabase
      .from("card_inventory")
      .select("card_id, quantity")
      .eq("league_id", league.id)
      .eq("user_id", user.id),
    supabase.from("cards").select("id, name, description, rarity").eq("enabled", true),
    supabase
      .from("matches")
      .select("id, kickoff_at, home:home_team_id(name), away:away_team_id(name)")
      .eq("status", "scheduled")
      .gt("kickoff_at", new Date().toISOString())
      .order("kickoff_at")
      .limit(20),
    supabase
      .from("league_members")
      .select("user_id, profiles:user_id(username)")
      .eq("league_id", league.id),
  ]);

  type Inv = { card_id: string; quantity: number };
  const inventory = (invRes.data ?? []) as Inv[];
  type Card = { id: string; name: string; description: string; rarity: string };
  const cards = (cardsRes.data ?? []) as Card[];
  type Match = {
    id: string;
    kickoff_at: string;
    home: { name: string | null } | null;
    away: { name: string | null } | null;
  };
  const matches = (matchesRes.data ?? []) as unknown as Match[];
  type Member = { user_id: string; profiles: { username: string | null } | null };
  const members = (membersRes.data ?? []) as unknown as Member[];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
          Cartes
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          {league.name}
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Joue 1 carte par match. Choisis ton match, ta carte, ta cible si besoin.
        </p>
      </header>

      {inventory.length === 0 ? (
        <div className={`${ui.glassCard} p-6 text-sm text-white/55`}>
          Aucune carte dans ton inventaire. Demande à l&apos;owner ou attends le prochain pack.
        </div>
      ) : (
        <CardsClient
          leagueId={league.id}
          inventory={inventory}
          cards={cards}
          matches={matches}
          members={members.filter((m) => m.user_id !== user.id)}
        />
      )}
    </div>
  );
}
