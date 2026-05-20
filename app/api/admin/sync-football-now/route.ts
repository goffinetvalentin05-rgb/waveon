import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";
import { runFootballSync } from "@/lib/football/sync";
import { validateFootballSyncPrerequisites } from "@/lib/football/sync-errors";
import { getFootballConfigDebug } from "@/lib/football/config-debug";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const configDebug = getFootballConfigDebug();
  const prereqErrors = validateFootballSyncPrerequisites();
  if (prereqErrors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: prereqErrors.join(" "),
        config: configDebug,
        hints: prereqErrors,
      },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await runFootballSync(guard.admin, { syncType: "admin_manual" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur sync inattendue";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        config: configDebug,
      },
      { status: 500 }
    );
  }

  const { data: lastSync } = await guard.admin
    .from("sync_logs")
    .select(
      "id, status, error_message, matches_imported, matches_updated, scores_updated, points_recalculated, raw_summary, started_at, finished_at"
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = result.ok ? 200 : result.skipped ? 400 : 500;
  return NextResponse.json(
    {
      ...result,
      config: configDebug,
      lastSync: lastSync ?? null,
    },
    { status }
  );
}
