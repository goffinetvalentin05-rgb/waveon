import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";
import { getFootballConfigDebug } from "@/lib/football/config-debug";
import { getFootballConfig } from "@/lib/football/config";
import { probeSportmonksCompetition } from "@/lib/football/providers/sportmonks";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const config = getFootballConfigDebug();
  const cfg = getFootballConfig();

  let probe: Awaited<ReturnType<typeof probeSportmonksCompetition>> | null = null;
  let probeError: string | null = null;
  if (cfg.apiKey && cfg.competitionId) {
    try {
      probe = await probeSportmonksCompetition(cfg);
    } catch (err) {
      probeError = err instanceof Error ? err.message : "Erreur probe Sportmonks";
    }
  }

  const { data: lastSync } = await guard.admin
    .from("sync_logs")
    .select(
      "id, status, error_message, matches_imported, matches_updated, raw_summary, started_at, finished_at"
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: matchesCount } = await guard.admin
    .from("matches")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    config,
    probe,
    probeError,
    database: {
      matchesCount: matchesCount ?? 0,
      lastSync: lastSync ?? null,
    },
  });
}
