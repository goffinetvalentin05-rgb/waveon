import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import {
  DashboardView,
  type DashboardLeague,
  type DashboardUpcomingMatch,
} from "@/components/dashboard/DashboardView";

function kindLabel(kind: string | undefined) {
  if (kind === "global") return "Générale";
  if (kind === "pro") return "Pro";
  return "Privée";
}

function leagueHref(kind: string | undefined, slug: string | undefined) {
  if (!slug) return "/dashboard";
  if (kind === "global") return "/global";
  return `/leagues/${slug}`;
}

function shortStageLabel(stage: string, groupName: string | null) {
  if (groupName) return `G ${groupName}`;
  const map: Record<string, string> = {
    group: "Grp",
    round_of_32: "1/16",
    round_of_16: "1/8",
    quarter_final: "1/4",
    semi_final: "1/2",
    third_place: "3e",
    final: "Finale",
  };
  return map[stage] ?? stage;
}

function teamCode(name: string | null | undefined, countryCode: string | null | undefined) {
  if (countryCode) return countryCode.toUpperCase().slice(0, 3);
  if (name) return name.slice(0, 2).toUpperCase();
  return "—";
}

export default async function DashboardPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, leaguesRes, pendingOwnedRes, upcomingRes, contestRes] =
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
          "id, match_number, kickoff_at, status, stage, group_name, home:home_team_id(name, country_code, flag_emoji), away:away_team_id(name, country_code, flag_emoji)"
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
    home: { name: string | null; country_code: string | null; flag_emoji: string | null } | null;
    away: { name: string | null; country_code: string | null; flag_emoji: string | null } | null;
  };
  const upcoming = (upcomingRes.data ?? []) as unknown as MatchRow[];

  const cs = contestRes.data as
    | { prize_title: string; prize_value_chf: number; ends_at: string | null; is_active: boolean }
    | null;

  const { count: aheadCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gt("total_points", profile?.total_points ?? 0);
  const rank = (aheadCount ?? 0) + 1;

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

  const dashboardLeagues: DashboardLeague[] = [
    ...leagues
      .filter((m) => m.leagues)
      .map((m, i) => ({
        key: `member-${m.leagues!.id}`,
        name: m.leagues!.name,
        kindLabel: kindLabel(m.leagues!.kind),
        points: m.points,
        href: leagueHref(m.leagues!.kind, m.leagues!.slug),
        iconVariant: ((i % 2) + 1) as 1 | 2,
      })),
    ...pendingOwned.map((l, i) => ({
      key: `pending-${l.id}`,
      name: l.name,
      kindLabel: kindLabel(l.kind),
      points: 0,
      href: "#",
      pending: true,
      pendingLabel: `Paiement en attente · ${l.plan === "pro" ? "Pro" : "Private"} League`,
      payHref: `/leagues/checkout/cancelled?league_id=${l.id}`,
      iconVariant: (((leagues.length + i) % 2) + 1) as 1 | 2,
    })),
  ];

  const upcomingMatches: DashboardUpcomingMatch[] = upcoming.map((m) => ({
    id: m.id,
    kickoffAt: m.kickoff_at,
    compLabel: shortStageLabel(m.stage, m.group_name),
    homeName: m.home?.name ?? "—",
    awayName: m.away?.name ?? "—",
    homeCode: teamCode(m.home?.name, m.home?.country_code),
    awayCode: teamCode(m.away?.name, m.away?.country_code),
  }));

  const contestTitle = cs
    ? `${cs.prize_title} · jusqu'à CHF ${cs.prize_value_chf}`
    : "Maillot de foot à gagner · jusqu'à CHF 120";

  const leaguesEmptyHint =
    privateLeagues.length === 0 && pendingOwned.length === 0
      ? "Tu n'es pas encore dans une ligue privée. Crée la tienne ou rejoins-en une avec un code."
      : undefined;

  return (
    <DashboardView
      username={profile?.username ?? "Joueur"}
      totalPoints={profile?.total_points ?? 0}
      rank={rank}
      contestTitle={contestTitle}
      contestSubtitle="Tu participes automatiquement au classement général"
      leagues={dashboardLeagues}
      leaguesEmptyHint={leaguesEmptyHint}
      upcomingMatches={upcomingMatches}
    />
  );
}
