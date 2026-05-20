import type { FootballConfig } from "@/lib/football/config";
import type { MatchStatus, NormalizedMatch } from "@/lib/football/types";

type SportmonksParticipant = {
  id?: number;
  name?: string;
  short_code?: string;
  meta?: { location?: string };
};

type SportmonksScore = {
  participant_id?: number;
  score?: { goals?: number | null };
  description?: string;
};

type SportmonksState = {
  developer_name?: string;
  short_name?: string;
};

type SportmonksVenue = {
  name?: string;
  city_name?: string;
  country?: { name?: string };
};

type SportmonksRound = {
  name?: string;
};

type SportmonksFixture = {
  id: number;
  starting_at?: string;
  state_id?: number;
  state?: SportmonksState;
  participants?: SportmonksParticipant[];
  scores?: SportmonksScore[];
  venue?: SportmonksVenue;
  round?: SportmonksRound;
  group_id?: number | null;
  league_id?: number;
  season_id?: number;
};

type SportmonksListResponse = {
  data?: SportmonksFixture[];
  pagination?: { has_more?: boolean; current_page?: number };
  message?: string;
};

const STATE_TO_STATUS: Record<string, MatchStatus> = {
  NS: "scheduled",
  TBD: "scheduled",
  DELAYED: "postponed",
  PST: "postponed",
  LIVE: "live",
  HT: "live",
  ET: "live",
  PEN_LIVE: "live",
  FT: "finished",
  AET: "finished",
  FT_PEN: "finished",
  CANC: "cancelled",
  ABD: "cancelled",
  WO: "finished",
};

function mapState(fixture: SportmonksFixture): MatchStatus {
  const dev = fixture.state?.developer_name?.toUpperCase();
  if (dev && STATE_TO_STATUS[dev]) return STATE_TO_STATUS[dev];
  return "scheduled";
}

function participantSide(
  participants: SportmonksParticipant[] | undefined,
  side: "home" | "away"
): SportmonksParticipant | undefined {
  return participants?.find(
    (p) => p.meta?.location?.toLowerCase() === side
  );
}

function extractGoals(
  scores: SportmonksScore[] | undefined,
  participantId: number | undefined
): number | null {
  if (!scores?.length || participantId == null) return null;
  const preferred = ["FT", "CURRENT", "2ND_HALF", "1ST_HALF"];
  for (const desc of preferred) {
    const row = scores.find(
      (s) =>
        s.participant_id === participantId &&
        (s.description?.toUpperCase() === desc ||
          s.description?.toUpperCase().includes(desc))
    );
    if (row?.score?.goals != null && Number.isFinite(row.score.goals)) {
      return row.score.goals;
    }
  }
  const any = scores.find((s) => s.participant_id === participantId);
  if (any?.score?.goals != null && Number.isFinite(any.score.goals)) {
    return any.score.goals;
  }
  return null;
}

function mapStage(roundName?: string): string {
  if (!roundName) return "group";
  const n = roundName.toLowerCase();
  if (n.includes("final") && !n.includes("semi") && !n.includes("quarter")) {
    return n.includes("3rd") || n.includes("third") ? "third_place" : "final";
  }
  if (n.includes("semi")) return "semi_final";
  if (n.includes("quarter")) return "quarter_final";
  if (n.includes("round of 16") || n.includes("1/8")) return "round_of_16";
  if (n.includes("round of 32") || n.includes("1/16")) return "round_of_32";
  if (n.includes("group")) return "group";
  return "group";
}

function normalizeFixture(
  fixture: SportmonksFixture,
  competitionId: string
): NormalizedMatch | null {
  const home = participantSide(fixture.participants, "home");
  const away = participantSide(fixture.participants, "away");
  if (!home?.id || !away?.id) return null;

  const kickoff = fixture.starting_at;
  if (!kickoff) return null;

  const status = mapState(fixture);
  const homeScore = extractGoals(fixture.scores, home.id);
  const awayScore = extractGoals(fixture.scores, away.id);

  return {
    externalProvider: "sportmonks",
    externalMatchId: String(fixture.id),
    externalCompetitionId: competitionId,
    homeTeamExternalId: String(home.id),
    awayTeamExternalId: String(away.id),
    homeTeamName: home.name ?? "Domicile",
    awayTeamName: away.name ?? "Extérieur",
    homeTeamCode: home.short_code?.toUpperCase(),
    awayTeamCode: away.short_code?.toUpperCase(),
    kickoffAt: new Date(kickoff).toISOString(),
    lockedAt: new Date(kickoff).toISOString(),
    status,
    homeScore: status === "finished" ? homeScore : homeScore,
    awayScore: status === "finished" ? awayScore : awayScore,
    stage: mapStage(fixture.round?.name),
    venue: fixture.venue?.name,
    city: fixture.venue?.city_name,
    country: fixture.venue?.country?.name,
    raw: fixture,
  };
}

async function fetchPage(
  url: string,
  apiKey: string
): Promise<SportmonksListResponse> {
  const u = new URL(url);
  u.searchParams.set("api_token", apiKey);
  const res = await fetch(u.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as SportmonksListResponse;
  if (!res.ok) {
    const msg = json.message ?? `Sportmonks HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function fetchSportmonksFixtures(
  cfg: FootballConfig
): Promise<NormalizedMatch[]> {
  if (!cfg.apiKey) throw new Error("FOOTBALL_API_KEY manquante.");
  if (!cfg.competitionId) throw new Error("FOOTBALL_COMPETITION_ID manquant.");

  const filterKey =
    cfg.competitionFilter === "league" ? "fixtureLeagues" : "fixtureSeasons";
  const includes = "participants;scores;state;venue;round";
  const base = `${cfg.baseUrl.replace(/\/$/, "")}/fixtures`;
  const all: NormalizedMatch[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${base}?filters=${filterKey}:${cfg.competitionId}&include=${includes}&per_page=50&page=${page}`;
    const json = await fetchPage(url, cfg.apiKey);
    const batch = json.data ?? [];
    for (const fx of batch) {
      const norm = normalizeFixture(fx, cfg.competitionId);
      if (norm) all.push(norm);
    }
    hasMore = Boolean(json.pagination?.has_more);
    page += 1;
    if (page > 100) break;
  }

  return all;
}
