import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import {
  DashboardView,
  type DashboardFeaturedMatch,
  type DashboardLeague,
  type DashboardUpcomingMatch,
} from "@/components/dashboard/DashboardView";
import { shortStageLabel, teamCode } from "@/lib/pronoclash/match-display";

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

type TeamRow = {
  name: string | null;
  country_code: string | null;
  flag_emoji: string | null;
} | null;

type MatchRow = {
  id: string;
  match_number: number | null;
  kickoff_at: string;
  status: string;
  stage: string;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home: TeamRow;
  away: TeamRow;
};

const MATCH_SELECT =
  "id, match_number, kickoff_at, status, stage, group_name, home_score, away_score, home_placeholder, away_placeholder, home:home_team_id(name, country_code, flag_emoji), away:away_team_id(name, country_code, flag_emoji)";

function teamDisplayName(team: TeamRow, placeholder: string | null) {
  if (team?.name) return team.name;
  if (placeholder) return placeholder;
  return "À déterminer";
}

function toUpcoming(m: MatchRow): DashboardUpcomingMatch {
  return {
    id: m.id,
    kickoffAt: m.kickoff_at,
    compLabel: shortStageLabel(m.stage, m.group_name),
    homeName: teamDisplayName(m.home, m.home_placeholder),
    awayName: teamDisplayName(m.away, m.away_placeholder),
    homeEmoji: m.home?.flag_emoji,
    awayEmoji: m.away?.flag_emoji,
  };
}

function toFeatured(m: MatchRow): DashboardFeaturedMatch {
  return {
    id: m.id,
    status: m.status === "live" ? "live" : "scheduled",
    kickoffAt: m.kickoff_at,
    stage: m.stage,
    groupName: m.group_name,
    homeName: teamDisplayName(m.home, m.home_placeholder),
    awayName: teamDisplayName(m.away, m.away_placeholder),
    homeCode: teamCode(m.home?.name, m.home?.country_code),
    awayCode: teamCode(m.away?.name, m.away?.country_code),
    homeEmoji: m.home?.flag_emoji,
    awayEmoji: m.away?.flag_emoji,
    homeScore: m.home_score,
    awayScore: m.away_score,
  };
}

export default async function DashboardPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const [profileRes, leaguesRes, pendingOwnedRes, contestRes, matchesCountRes, liveRes, upcoming24Res, upcomingListRes] =
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
        .from("contest_settings")
        .select("prize_title, prize_value_chf, ends_at, is_active")
        .limit(1)
        .maybeSingle(),
      supabase.from("matches").select("id", { count: "exact", head: true }),
      supabase
        .from("matches")
        .select(MATCH_SELECT)
        .eq("status", "live")
        .order("kickoff_at")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("matches")
        .select(MATCH_SELECT)
        .eq("status", "scheduled")
        .gte("kickoff_at", nowIso)
        .lte("kickoff_at", in24h)
        .order("kickoff_at")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("matches")
        .select(MATCH_SELECT)
        .eq("status", "scheduled")
        .gt("kickoff_at", nowIso)
        .order("kickoff_at")
        .limit(8),
    ]);

  const profile = profileRes.data;
  const leagues = (leaguesRes.data ?? []) as unknown as Array<{
    role: string;
    points: number;
    leagues: { id: string; slug: string; name: string; kind: string; max_players: number } | null;
  }>;

  const upcomingRows = (upcomingListRes.data ?? []) as unknown as MatchRow[];
  const liveRow = liveRes.data as MatchRow | null;
  const upcoming24Row = upcoming24Res.data as MatchRow | null;
  const featuredSource = liveRow ?? upcoming24Row;
  const featuredMatch = featuredSource ? toFeatured(featuredSource) : null;
  const featuredId = featuredMatch?.id;

  const upcomingMatches: DashboardUpcomingMatch[] = upcomingRows
    .filter((m) => m.id !== featuredId)
    .map(toUpcoming);

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
      .map((m) => ({
        key: `member-${m.leagues!.id}`,
        name: m.leagues!.name,
        kindLabel: kindLabel(m.leagues!.kind),
        points: m.points,
        href: leagueHref(m.leagues!.kind, m.leagues!.slug),
      })),
    ...pendingOwned.map((l) => ({
      key: `pending-${l.id}`,
      name: l.name,
      kindLabel: kindLabel(l.kind),
      points: 0,
      href: "#",
      pending: true,
      pendingLabel: `Paiement en attente · ${l.plan === "pro" ? "Pro" : "Private"} League`,
      payHref: `/leagues/checkout/cancelled?league_id=${l.id}`,
    })),
  ];

  const contestTitle =
    cs && cs.is_active !== false
      ? `${cs.prize_title} · jusqu'à CHF ${cs.prize_value_chf}`
      : null;

  const leaguesEmptyHint =
    privateLeagues.length === 0 && pendingOwned.length === 0
      ? "Tu n'es pas encore dans une ligue privée. Crée la tienne ou rejoins-en une avec un code."
      : undefined;

  return (
    <DashboardView
      username={profile?.username}
      email={user.email}
      totalPoints={profile?.total_points ?? 0}
      rank={rank}
      contestTitle={contestTitle}
      contestSubtitle={
        contestTitle ? "Tu participes automatiquement au classement général" : undefined
      }
      leagues={dashboardLeagues}
      leaguesEmptyHint={leaguesEmptyHint}
      upcomingMatches={upcomingMatches}
      featuredMatch={featuredMatch}
      hasAnyMatchesInDb={(matchesCountRes.count ?? 0) > 0}
    />
  );
}
