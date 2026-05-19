import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const homeTeamId = typeof body.homeTeamId === "string" ? body.homeTeamId : "";
  const awayTeamId = typeof body.awayTeamId === "string" ? body.awayTeamId : "";
  const kickoffAt = typeof body.kickoffAt === "string" ? body.kickoffAt : "";
  const stage = typeof body.stage === "string" ? body.stage : "group";

  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId || !kickoffAt) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const { data, error } = await guard.admin
    .from("matches")
    .insert({
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      kickoff_at: kickoffAt,
      stage,
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
