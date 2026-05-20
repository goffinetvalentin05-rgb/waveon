import { notFound, redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { V1_CARD_IDS } from "@/lib/pronoclash/card-messages";
import { AppSecondaryPage } from "@/components/pronoclash/AppSecondaryPage";
import { fetchAppShellProfile } from "@/lib/pronoclash/app-shell-profile";
import { CardsClient } from "./CardsClient";

type RouteParams = { slug: string };

export default async function LeagueCardsPage(props: { params: Promise<RouteParams> }) {
  const params = await props.params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("id, slug, name, kind, status")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!league || league.kind === "global") notFound();
  if (league.status !== "active") notFound();

  const [invRes, cardsRes, matchesRes, membersRes] = await Promise.all([
    supabase
      .from("card_inventory")
      .select("card_id, quantity")
      .eq("league_id", league.id)
      .eq("user_id", user.id),
    supabase
      .from("cards")
      .select("id, name, description, rarity")
      .in("id", [...V1_CARD_IDS])
      .eq("is_active", true),
    supabase
      .from("matches")
      .select("id, kickoff_at, locked_at, home:home_team_id(name), away:away_team_id(name)")
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
  const totalQty = inventory.reduce((s, i) => s + (i.quantity ?? 0), 0);
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

  const shell = await fetchAppShellProfile();

  return (
    <AppSecondaryPage
      pageTitle={`${league.name} · cartes`}
      username={shell.username}
      email={shell.email}
      isAdmin={shell.isAdmin}
    >
      <p className="pc-eyebrow">Cartes</p>
      <p className="pc-body-text" style={{ marginTop: 0 }}>
        Joue 1 carte par match. Choisis ton match, ta carte, ta cible si besoin.
      </p>

      {totalQty === 0 ? (
        <div className="pc-glass pc-form-card pc-body-text" style={{ marginTop: 16 }}>
          Aucune carte restante
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
    </AppSecondaryPage>
  );
}
