import type { SupabaseClient } from "@supabase/supabase-js";
import { createFootballProvider } from "@/lib/football/provider";
import { getFootballConfig, isFootballSyncConfigured } from "@/lib/football/config";
import type { FootballSyncResult, NormalizedMatch } from "@/lib/football/types";
import { recalculateMatchPoints } from "@/lib/scoring/recalculate";

function slugify(name: string, code?: string): string {
  if (code) return code.toLowerCase().replace(/[^a-z0-9]/g, "");
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveTeamId(
  admin: SupabaseClient,
  provider: string,
  externalTeamId: string,
  name: string,
  countryCode?: string
): Promise<string> {
  const { data: byExt } = await admin
    .from("teams")
    .select("id")
    .eq("external_api_provider", provider)
    .eq("external_team_id", externalTeamId)
    .maybeSingle();
  if (byExt?.id) return byExt.id as string;

  if (countryCode) {
    const { data: byCode } = await admin
      .from("teams")
      .select("id")
      .eq("country_code", countryCode)
      .maybeSingle();
    if (byCode?.id) {
      await admin
        .from("teams")
        .update({
          external_api_provider: provider,
          external_team_id: externalTeamId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", byCode.id);
      return byCode.id as string;
    }
  }

  const slug = slugify(name, countryCode);
  const { data: inserted, error } = await admin
    .from("teams")
    .insert({
      name,
      slug,
      country_code: countryCode ?? null,
      external_api_provider: provider,
      external_team_id: externalTeamId,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) {
    const { data: bySlug } = await admin
      .from("teams")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (bySlug?.id) {
      await admin
        .from("teams")
        .update({
          external_api_provider: provider,
          external_team_id: externalTeamId,
        })
        .eq("id", bySlug.id);
      return bySlug.id as string;
    }
    throw new Error(`team insert: ${error.message}`);
  }
  return inserted.id as string;
}

function scoresChanged(
  prev: { home_score: number | null; away_score: number | null; status: string },
  next: NormalizedMatch
): boolean {
  return (
    prev.home_score !== next.homeScore ||
    prev.away_score !== next.awayScore ||
    prev.status !== next.status
  );
}

function shouldRecalculate(
  prev: { status: string; home_score: number | null; away_score: number | null },
  next: NormalizedMatch
): boolean {
  if (next.status !== "finished") return false;
  if (next.homeScore == null || next.awayScore == null) return false;
  const becameFinished = prev.status !== "finished";
  const scoresDiff =
    prev.home_score !== next.homeScore || prev.away_score !== next.awayScore;
  return becameFinished || scoresDiff;
}

export async function runFootballSync(
  admin: SupabaseClient,
  options?: { syncType?: string }
): Promise<FootballSyncResult> {
  const cfg = getFootballConfig();
  const syncType = options?.syncType ?? "full";
  const now = new Date().toISOString();

  if (!isFootballSyncConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: "FOOTBALL_API_KEY ou FOOTBALL_COMPETITION_ID absent — mode manuel.",
      matchesImported: 0,
      matchesUpdated: 0,
      scoresUpdated: 0,
      pointsRecalculated: 0,
      matchIdsRecalculated: [],
    };
  }

  const { data: logRow, error: logErr } = await admin
    .from("sync_logs")
    .insert({
      provider: cfg.provider,
      sync_type: syncType,
      status: "running",
      started_at: now,
    })
    .select("id")
    .single();

  if (logErr) throw new Error(`sync_log insert: ${logErr.message}`);
  const logId = logRow.id as string;

  let matchesImported = 0;
  let matchesUpdated = 0;
  let scoresUpdated = 0;
  let pointsRecalculated = 0;
  const matchIdsRecalculated: string[] = [];

  try {
    const football = createFootballProvider();
    const fixtures = await football.fetchCompetitionMatches();

    if (fixtures.length === 0) {
      throw new Error(
        "Sportmonks a répondu mais 0 match normalisable — vérifiez FOOTBALL_COMPETITION_ID et FOOTBALL_COMPETITION_FILTER (season vs league)."
      );
    }

    for (const m of fixtures) {
      const homeTeamId = m.homeTeamExternalId
        ? await resolveTeamId(
            admin,
            m.externalProvider,
            m.homeTeamExternalId,
            m.homeTeamName,
            m.homeTeamCode
          )
        : null;
      const awayTeamId = m.awayTeamExternalId
        ? await resolveTeamId(
            admin,
            m.externalProvider,
            m.awayTeamExternalId,
            m.awayTeamName,
            m.awayTeamCode
          )
        : null;

      const { data: existing } = await admin
        .from("matches")
        .select("id, status, home_score, away_score")
        .eq("external_match_id", m.externalMatchId)
        .maybeSingle();

      const winnerTeamId =
        m.status === "finished" &&
        m.homeScore != null &&
        m.awayScore != null
          ? m.homeScore > m.awayScore
            ? homeTeamId
            : m.awayScore > m.homeScore
              ? awayTeamId
              : null
          : null;

      const payload = {
        external_api_provider: m.externalProvider,
        external_match_id: m.externalMatchId,
        external_competition_id: m.externalCompetitionId ?? null,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        stage: m.stage ?? "group",
        group_name: m.groupName ?? null,
        venue: m.venue ?? null,
        city: m.city ?? null,
        country: m.country ?? null,
        kickoff_at: m.kickoffAt,
        locked_at: m.lockedAt,
        status: m.status,
        home_score: m.homeScore,
        away_score: m.awayScore,
        winner_team_id: winnerTeamId,
        is_draw:
          m.status === "finished" &&
          m.homeScore != null &&
          m.awayScore != null &&
          m.homeScore === m.awayScore,
        last_synced_at: now,
        score_last_synced_at:
          m.homeScore != null || m.awayScore != null ? now : null,
        raw_api_payload: m.raw,
        updated_at: now,
      };

      if (!existing) {
        const { error: insErr } = await admin.from("matches").insert(payload);
        if (insErr) throw new Error(`match insert: ${insErr.message}`);
        matchesImported++;
        if (m.status === "finished" && m.homeScore != null && m.awayScore != null) {
          const { data: row } = await admin
            .from("matches")
            .select("id")
            .eq("external_match_id", m.externalMatchId)
            .maybeSingle();
          if (row?.id) {
            const n = await recalculateMatchPoints(admin, row.id as string);
            pointsRecalculated += n;
            matchIdsRecalculated.push(row.id as string);
          }
        }
        continue;
      }

      const prev = existing as {
        id: string;
        status: string;
        home_score: number | null;
        away_score: number | null;
      };
      const changed = scoresChanged(prev, m);
      if (changed) {
        matchesUpdated++;
        if (m.homeScore != null || m.awayScore != null) scoresUpdated++;
      }

      const { error: upErr } = await admin
        .from("matches")
        .update(payload)
        .eq("id", prev.id);
      if (upErr) throw new Error(`match update: ${upErr.message}`);

      if (shouldRecalculate(prev, m)) {
        const n = await recalculateMatchPoints(admin, prev.id);
        pointsRecalculated += n;
        matchIdsRecalculated.push(prev.id);
      }
    }

    await admin
      .from("sync_logs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        matches_imported: matchesImported,
        matches_updated: matchesUpdated,
        scores_updated: scoresUpdated,
        points_recalculated: pointsRecalculated,
        raw_summary: {
          fixturesFetched: fixtures.length,
          competitionFilter: cfg.competitionFilter,
          competitionId: cfg.competitionId,
          matchIdsRecalculated,
        },
      })
      .eq("id", logId);

    return {
      ok: true,
      logId,
      matchesImported,
      matchesUpdated,
      scoresUpdated,
      pointsRecalculated,
      matchIdsRecalculated,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur sync";
    const hint =
      message.includes("sync_log insert") || message.includes("relation")
        ? " — migration 20260521120000_football_api_sync.sql peut être absente."
        : message.includes("match insert") || message.includes("column")
          ? " — colonnes API football absentes sur matches/teams ?"
          : "";
    const fullMessage = message + hint;
    await admin
      .from("sync_logs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: fullMessage,
        matches_imported: matchesImported,
        matches_updated: matchesUpdated,
        scores_updated: scoresUpdated,
        points_recalculated: pointsRecalculated,
        raw_summary: {
          competitionFilter: cfg.competitionFilter,
          competitionId: cfg.competitionId,
          failed: true,
        },
      })
      .eq("id", logId);

    return {
      ok: false,
      logId,
      error: fullMessage,
      matchesImported,
      matchesUpdated,
      scoresUpdated,
      pointsRecalculated,
      matchIdsRecalculated,
    };
  }
}
