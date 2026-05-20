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
  data?: SportmonksFixture[] | SportmonksScheduleStage[];
  pagination?: { has_more?: boolean; current_page?: number };
  message?: string;
};

type SportmonksScheduleRound = {
  name?: string;
  fixtures?: SportmonksFixture[];
};

type SportmonksScheduleStage = {
  rounds?: SportmonksScheduleRound[];
};

export type SportmonksPageDebug = {
  requestUrl: string;
  httpStatus: number;
  rawCount: number;
  normalizedCount: number;
  apiMessage?: string;
  firstRawFixture?: unknown;
  filterKey: string;
  source: "fixtures" | "schedules/seasons";
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

/** URL affichable dans les logs (api_token masqué). */
export function redactSportmonksUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api_token")) {
      u.searchParams.set("api_token", "***");
    }
    return u.toString();
  } catch {
    return url.replace(/api_token=[^&]+/gi, "api_token=***");
  }
}

function footballApiRoot(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function mapState(fixture: SportmonksFixture): MatchStatus {
  const dev = fixture.state?.developer_name?.toUpperCase();
  if (dev && STATE_TO_STATUS[dev]) return STATE_TO_STATUS[dev];
  return "scheduled";
}

function resolveParticipants(
  participants: SportmonksParticipant[] | undefined
): { home?: SportmonksParticipant; away?: SportmonksParticipant } {
  if (!participants?.length) return {};
  const home = participants.find((p) => p.meta?.location?.toLowerCase() === "home");
  const away = participants.find((p) => p.meta?.location?.toLowerCase() === "away");
  if (home?.id && away?.id) return { home, away };
  if (participants.length >= 2) {
    return { home: participants[0], away: participants[1] };
  }
  return { home, away };
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
  const { home, away } = resolveParticipants(fixture.participants);
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

function flattenScheduleStages(stages: SportmonksScheduleStage[]): SportmonksFixture[] {
  const out: SportmonksFixture[] = [];
  for (const stage of stages) {
    for (const round of stage.rounds ?? []) {
      for (const fx of round.fixtures ?? []) {
        out.push({
          ...fx,
          round: fx.round ?? (round.name ? { name: round.name } : undefined),
        });
      }
    }
  }
  return out;
}

async function fetchSportmonksJson<T extends SportmonksListResponse>(
  url: string,
  apiKey: string,
  label: string
): Promise<{ json: T; httpStatus: number; requestUrl: string }> {
  const u = new URL(url);
  u.searchParams.set("api_token", apiKey);
  const requestUrl = u.toString();
  const safeUrl = redactSportmonksUrl(requestUrl);

  const res = await fetch(requestUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T;
  const batch = Array.isArray(json.data) ? json.data : [];
  const firstRaw = batch[0] as unknown | undefined;

  console.info(`[sportmonks] ${label}`, {
    url: safeUrl,
    httpStatus: res.status,
    rawCount: batch.length,
    apiMessage: json.message ?? null,
    firstRawFixture: firstRaw ?? null,
  });

  if (!res.ok) {
    const msg =
      json.message ??
      (res.status === 401 || res.status === 403
        ? "Clé API Sportmonks invalide ou non autorisée."
        : res.status === 404
          ? "Endpoint Sportmonks introuvable — vérifiez FOOTBALL_API_BASE_URL (sans /football en double)."
          : `Sportmonks HTTP ${res.status}`);
    throw new Error(msg);
  }

  return { json, httpStatus: res.status, requestUrl: safeUrl };
}

async function fetchFixturesByFilter(
  cfg: FootballConfig,
  filterKey: "fixtureSeasons" | "fixtureLeagues",
  options?: { maxPages?: number }
): Promise<{ matches: NormalizedMatch[]; debug: SportmonksPageDebug }> {
  const maxPages = options?.maxPages ?? 100;
  const includes = "participants;scores;state;venue;round";
  const base = `${footballApiRoot(cfg.baseUrl)}/fixtures`;
  const all: NormalizedMatch[] = [];
  let page = 1;
  let hasMore = true;
  let lastDebug: SportmonksPageDebug = {
    requestUrl: "",
    httpStatus: 0,
    rawCount: 0,
    normalizedCount: 0,
    filterKey,
    source: "fixtures",
  };

  while (hasMore) {
    const url = `${base}?filters=${filterKey}:${cfg.competitionId}&include=${includes}&per_page=50&page=${page}`;
    const { json, httpStatus, requestUrl } = await fetchSportmonksJson<SportmonksListResponse>(
      url,
      cfg.apiKey!,
      `fixtures page ${page} (${filterKey})`
    );
    const batch = (json.data ?? []) as SportmonksFixture[];
    let normalizedOnPage = 0;
    for (const fx of batch) {
      const norm = normalizeFixture(fx, cfg.competitionId!);
      if (norm) {
        all.push(norm);
        normalizedOnPage++;
      }
    }
    lastDebug = {
      requestUrl,
      httpStatus,
      rawCount: batch.length,
      normalizedCount: normalizedOnPage,
      apiMessage: json.message,
      firstRawFixture: batch[0],
      filterKey,
      source: "fixtures",
    };
    hasMore = Boolean(json.pagination?.has_more);
    page += 1;
    if (page > maxPages) break;
  }

  return { matches: all, debug: { ...lastDebug, normalizedCount: all.length } };
}

async function fetchSeasonScheduleFixtures(
  cfg: FootballConfig
): Promise<{ matches: NormalizedMatch[]; debug: SportmonksPageDebug }> {
  const url = `${footballApiRoot(cfg.baseUrl)}/schedules/seasons/${cfg.competitionId}`;
  const { json, httpStatus, requestUrl } = await fetchSportmonksJson<SportmonksListResponse>(
    url,
    cfg.apiKey!,
    "schedules/seasons fallback"
  );
  const stages = (json.data ?? []) as SportmonksScheduleStage[];
  const batch = flattenScheduleStages(stages);
  const all: NormalizedMatch[] = [];
  for (const fx of batch) {
    const norm = normalizeFixture(fx, cfg.competitionId!);
    if (norm) all.push(norm);
  }
  return {
    matches: all,
    debug: {
      requestUrl,
      httpStatus,
      rawCount: batch.length,
      normalizedCount: all.length,
      apiMessage: json.message,
      firstRawFixture: batch[0],
      filterKey: "schedules/seasons",
      source: "schedules/seasons",
    },
  };
}

/** Teste season (fixtureSeasons) et league (fixtureLeagues) sans modifier les variables d'env. */
export async function probeSportmonksCompetition(cfg: FootballConfig) {
  if (!cfg.apiKey) throw new Error("FOOTBALL_API_KEY manquante.");
  if (!cfg.competitionId) throw new Error("FOOTBALL_COMPETITION_ID manquant.");

  const season = await fetchFixturesByFilter(cfg, "fixtureSeasons", { maxPages: 1 });
  const league = await fetchFixturesByFilter(cfg, "fixtureLeagues", { maxPages: 1 });

  let scheduleFallback: SportmonksPageDebug | null = null;
  let scheduleCount = 0;
  if (cfg.competitionFilter === "season" && season.matches.length === 0) {
    try {
      const sched = await fetchSeasonScheduleFixtures(cfg);
      scheduleFallback = sched.debug;
      scheduleCount = sched.matches.length;
    } catch (err) {
      scheduleFallback = {
        requestUrl: `${footballApiRoot(cfg.baseUrl)}/schedules/seasons/${cfg.competitionId}`,
        httpStatus: 0,
        rawCount: 0,
        normalizedCount: 0,
        filterKey: "schedules/seasons",
        source: "schedules/seasons",
        apiMessage: err instanceof Error ? err.message : "Erreur schedules",
      };
    }
  }

  const recommendation =
    season.matches.length > 0
      ? "Utilisez FOOTBALL_COMPETITION_FILTER=season (fixtureSeasons fonctionne)."
      : league.matches.length > 0
        ? "Utilisez FOOTBALL_COMPETITION_FILTER=league — l'ID semble être un league_id, pas un season_id."
        : scheduleCount > 0
          ? "season_id valide via /schedules/seasons — la sync utilisera ce repli automatiquement."
          : "Aucune fixture pour season ni league — vérifiez FOOTBALL_COMPETITION_ID (season vs league) dans Sportmonks ID Finder.";

  return {
    competitionId: cfg.competitionId,
    configuredFilter: cfg.competitionFilter,
    season: {
      filter: "fixtureSeasons",
      rawCount: season.debug.rawCount,
      normalizedCount: season.matches.length,
      sampleUrl: season.debug.requestUrl,
      httpStatus: season.debug.httpStatus,
      firstRaw: season.debug.firstRawFixture,
      apiMessage: season.debug.apiMessage,
    },
    league: {
      filter: "fixtureLeagues",
      rawCount: league.debug.rawCount,
      normalizedCount: league.matches.length,
      sampleUrl: league.debug.requestUrl,
      httpStatus: league.debug.httpStatus,
      firstRaw: league.debug.firstRawFixture,
      apiMessage: league.debug.apiMessage,
    },
    scheduleFallback: scheduleFallback
      ? {
          ...scheduleFallback,
          normalizedCount: scheduleCount,
        }
      : null,
    recommendation,
  };
}

export async function fetchSportmonksFixtures(
  cfg: FootballConfig
): Promise<NormalizedMatch[]> {
  if (!cfg.apiKey) throw new Error("FOOTBALL_API_KEY manquante.");
  if (!cfg.competitionId) throw new Error("FOOTBALL_COMPETITION_ID manquant.");

  if (cfg.baseUrl.match(/\/football\/football/i)) {
    throw new Error(
      "FOOTBALL_API_BASE_URL invalide : chemin /football/football détecté. Utilisez https://api.sportmonks.com/v3/football"
    );
  }

  const filterKey =
    cfg.competitionFilter === "league" ? "fixtureLeagues" : "fixtureSeasons";

  const { matches, debug } = await fetchFixturesByFilter(cfg, filterKey);

  if (matches.length > 0) {
    console.info("[sportmonks] sync fixtures OK", {
      filterKey,
      total: matches.length,
      lastPage: debug,
    });
    return matches;
  }

  if (cfg.competitionFilter === "season") {
    console.warn(
      "[sportmonks] fixtureSeasons a renvoyé 0 match — tentative /schedules/seasons/{id}"
    );
    const sched = await fetchSeasonScheduleFixtures(cfg);
    if (sched.matches.length > 0) {
      console.info("[sportmonks] sync via schedules/seasons", {
        total: sched.matches.length,
        debug: sched.debug,
      });
      return sched.matches;
    }
  }

  const probe = await probeSportmonksCompetition(cfg);
  throw new Error(
    `Aucune fixture Sportmonks pour ${filterKey}:${cfg.competitionId}. ` +
      `Probe — season: ${probe.season.normalizedCount}, league: ${probe.league.normalizedCount}. ` +
      probe.recommendation
  );
}
