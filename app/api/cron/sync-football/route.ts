import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/football/cron-auth";
import { runFootballSync } from "@/lib/football/sync";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}

async function handleSync(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const result = await runFootballSync(admin, { syncType: "cron" });

  const status = result.ok ? 200 : result.skipped ? 200 : 500;
  return NextResponse.json(result, { status });
}
