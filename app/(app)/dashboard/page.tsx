import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import {
  DashboardView,
  type DashboardFeaturedMatch,
  type DashboardLeagueCard,
} from "@/components/dashboard/DashboardView";
import type {
  DashboardPrediction,
  DashboardPreviewMatch,
} from "@/components/dashboard/DashboardClient";
import type { LeagueContextOption } from "@/components/pronoclash/LeagueContextSelector";
import { shortStageLabel } from "@/lib/pronoclash/match-display";
import { matchesPageHref } from "@/lib/pronoclash/league-context-url";

function typeLabel(kind: string | undefined) {
  if (kind === "global") return "Générale";
  if (kind === "pro") return "Pro";
  return "Privée";
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
  locked_at: string | null;
  status: string;
  stage: string;
  group_name: string | null;
  venue: string | null;
  city: string | null;
  home_score: number | null;
  away_score: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home: TeamRow;
  away: TeamRow;
};

function venueLabel(m: MatchRow): string | null {
  const parts = [m.venue, m.city].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

const MATCH_SELECT =
  "id, match_number, kickoff_at, locked_at, status, stage, group_name, venue, city, home_score, away_score, home_placeholder, away_placeholder, home:home_team_id(name, country_code, flag_emoji), away:away_team_id(name, country_code, flag_emoji)";

function teamDisplayName(team: TeamRow, placeholder: string | null) {
  return team?.name ?? placeholder ?? null;
}

function toPreview(m: MatchRow): DashboardPreviewMatch {
  return {
    id: m.id,
    kickoffAt: m.kickoff_at,
    compLabel: shortStageLabel(m.stage, m.group_name),
    status: m.status,
    lockedAt: m.locked_at,
    venueLabel: venueLabel(m),
    homeName: teamDisplayName(m.home, m.home_placeholder),
    awayName: teamDisplayName(m.away, m.away_placeholder),
    homeCountryCode: m.home?.country_code ?? null,
    awayCountryCode: m.away?.country_code ?? null,
    homeFlag: m.home?.flag_emoji ?? null,
    awayFlag: m.away?.flag_emoji ?? null,
    homePlaceholder: m.home_placeholder,
    awayPlaceholder: m.away_placeholder,
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
    homeCountryCode: m.home?.country_code ?? null,
    awayCountryCode: m.away?.country_code ?? null,
    homeFlag: m.home?.flag_emoji ?? null,
    awayFlag: m.away?.flag_emoji ?? null,
    homePlaceholder: m.home_placeholder,
    awayPlaceholder: m.away_placeholder,
    homeScore: m.home_score,
    awayScore: m.away_score,
  };
}

function computeRankInLeague(
  members: Array<{ user_id: string; points: number }>,
  userId: string
): number {
  const me = members.find((m) => m.user_id === userId);
  if (!me) return members.length + 1;
  const ahead = members.filter((m) => m.points > me.points).length;
  return ahead + 1;
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

  const [
    profileRes,
    leaguesRes,
    pendingOwnedRes,
    contestRes,
    matchesCountRes,
    liveRes,
    upcoming24Res,
    upcomingListRes,
    predictionsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_color, total_points, is_admin")
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
    supabase.from("contest_settings").select("is_active").limit(1).maybeSingle(),
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
    supabase
      .from("predictions")
      .select("match_id, league_id, predicted_home_score, predicted_away_score, exact_score")
      .eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
  const leagues = (leaguesRes.data ?? []) as unknown as Array<{
    role: string;
    points: number;
    leagues: { id: string; slug: string; name: string; kind: string; max_players: number } | null;
  }>;

  const privateMemberships = leagues.filter((m) => m.leagues && m.leagues.kind !== "global");
  const privateLeagueIds = privateMemberships
    .map((m) => m.leagues!.id)
    .filter((id, i, arr) => arr.indexOf(id) === i);

  const membersByLeague = new Map<string, Array<{ user_id: string; points: number }>>();
  if (privateLeagueIds.length > 0) {
    const { data: allMembers } = await supabase
      .from("league_members")
      .select("league_id, user_id, points")
      .in("league_id", privateLeagueIds);
    for (const row of allMembers ?? []) {
      const list = membersByLeague.get(row.league_id) ?? [];
      list.push({ user_id: row.user_id, points: row.points ?? 0 });
      membersByLeague.set(row.league_id, list);
    }
  }

  const upcomingRows = (upcomingListRes.data ?? []) as unknown as MatchRow[];
  const liveRow = liveRes.data as MatchRow | null;
  const upcoming24Row = upcoming24Res.data as MatchRow | null;
  const featuredSource = liveRow ?? upcoming24Row;
  const featuredMatch = featuredSource ? toFeatured(featuredSource) : null;
  const featuredId = featuredMatch?.id;

  const upcomingMatches: DashboardPreviewMatch[] = upcomingRows
    .filter((m) => m.id !== featuredId)
    .map(toPreview);

  const predictionsRaw = (predictionsRes.data ?? []) as Array<{
    match_id: string;
    league_id: string | null;
    predicted_home_score: number;
    predicted_away_score: number;
    exact_score?: boolean;
  }>;
  const predictions: DashboardPrediction[] = predictionsRaw.map(
    ({ match_id, league_id, predicted_home_score, predicted_away_score }) => ({
      match_id,
      league_id,
      predicted_home_score,
      predicted_away_score,
    })
  );
  const generalPreds = predictionsRaw.filter((p) => p.league_id === null);
  const exactScores = generalPreds.filter((p) => p.exact_score).length;
  const predictionsPlayed = generalPreds.length;

  const cs = contestRes.data as { is_active: boolean } | null;

  const { count: aheadCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gt("total_points", profile?.total_points ?? 0);
  const globalRank = (aheadCount ?? 0) + 1;

  const pendingOwned = (pendingOwnedRes.data ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    kind: string;
    plan: string | null;
    status: string;
    max_players: number;
  }>;

  const generalCard: DashboardLeagueCard = {
    key: "general",
    leagueContextId: null,
    name: "Ligue générale",
    typeLabel: "Générale",
    type: "general",
    points: profile?.total_points ?? 0,
    rank: globalRank,
    predictHref: matchesPageHref(null),
    leaderboardHref: "/global/leaderboard",
  };

  const privateCards: DashboardLeagueCard[] = privateMemberships.map((m) => {
    const lg = m.leagues!;
    const members = membersByLeague.get(lg.id) ?? [];
    return {
      key: `member-${lg.id}`,
      leagueContextId: lg.id,
      name: lg.name,
      typeLabel: typeLabel(lg.kind),
      type: lg.kind === "pro" ? "pro" : "private",
      points: m.points,
      rank: computeRankInLeague(members, user.id),
      memberCount: members.length,
      predictHref: matchesPageHref(lg.id),
      leaderboardHref: `/leagues/${lg.slug}/leaderboard`,
    };
  });

  const pendingCards: DashboardLeagueCard[] = pendingOwned.map((l) => ({
    key: `pending-${l.id}`,
    leagueContextId: l.id,
    name: l.name,
    typeLabel: typeLabel(l.kind),
    type: l.kind === "pro" ? "pro" : "private",
    points: 0,
    rank: null,
    pending: true,
    pendingLabel: `Paiement requis · ${l.plan === "pro" ? "Pro" : "Private"} League`,
    payHref: `/leagues/checkout/cancelled?league_id=${l.id}`,
    predictHref: "#",
    leaderboardHref: "#",
  }));

  const leagueCards = [generalCard, ...privateCards, ...pendingCards];

  const leagueOptions: LeagueContextOption[] = [
    { id: null, name: "Ligue générale", kind: "general" },
    ...privateMemberships.map((m) => ({
      id: m.leagues!.id as string,
      name: m.leagues!.name,
      kind: (m.leagues!.kind === "pro" ? "pro" : "private") as "pro" | "private",
    })),
  ];

  const contestActive = cs != null && cs.is_active !== false;

  const leaguesEmptyHint =
    privateMemberships.length === 0 && pendingOwned.length === 0
      ? "Tu joues déjà dans la ligue générale. Crée ou rejoins une ligue privée pour défier tes potes avec des pronos séparés."
      : undefined;

  return (
    <DashboardView
      username={profile?.username}
      email={user.email}
      totalPoints={profile?.total_points ?? 0}
      rank={globalRank}
      exactScores={exactScores}
      predictionsPlayed={predictionsPlayed}
      contestActive={contestActive}
      leagueCards={leagueCards}
      leaguesEmptyHint={leaguesEmptyHint}
      leagueOptions={leagueOptions}
      predictions={predictions}
      upcomingMatches={upcomingMatches}
      featuredMatch={featuredMatch}
      hasAnyMatchesInDb={(matchesCountRes.count ?? 0) > 0}
      isAdmin={Boolean(profile?.is_admin)}
    />
  );
}
