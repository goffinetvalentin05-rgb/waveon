import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";
import { runFootballSync } from "@/lib/football/sync";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const result = await runFootballSync(guard.admin, { syncType: "admin_manual" });
  const status = result.ok ? 200 : result.skipped ? 400 : 500;
  return NextResponse.json(result, { status });
}
