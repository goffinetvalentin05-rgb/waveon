import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const matchNumber =
    typeof body.matchNumber === "number"
      ? body.matchNumber
      : body.matchNumber == null
        ? null
        : Number(body.matchNumber);
  const stage = typeof body.stage === "string" ? body.stage : "group";
  const groupName = typeof body.groupName === "string" ? body.groupName : null;
  const homeTeamId = typeof body.homeTeamId === "string" ? body.homeTeamId : null;
  const awayTeamId = typeof body.awayTeamId === "string" ? body.awayTeamId : null;
  const homePlaceholder =
    typeof body.homePlaceholder === "string" ? body.homePlaceholder : null;
  const awayPlaceholder =
    typeof body.awayPlaceholder === "string" ? body.awayPlaceholder : null;
  const venue = typeof body.venue === "string" ? body.venue : null;
  const city = typeof body.city === "string" ? body.city : null;
  const country = typeof body.country === "string" ? body.country : null;
  const kickoffAt = typeof body.kickoffAt === "string" ? body.kickoffAt : "";

  if (!kickoffAt) {
    return NextResponse.json({ error: "Date de coup d'envoi requise." }, { status: 400 });
  }
  if (!homeTeamId && !homePlaceholder) {
    return NextResponse.json(
      { error: "Équipe domicile ou placeholder requis." },
      { status: 400 }
    );
  }
  if (!awayTeamId && !awayPlaceholder) {
    return NextResponse.json(
      { error: "Équipe extérieur ou placeholder requis." },
      { status: 400 }
    );
  }
  if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
    return NextResponse.json({ error: "Les deux équipes sont identiques." }, { status: 400 });
  }

  const lockedAt = new Date(kickoffAt).toISOString();

  const { data, error } = await guard.admin
    .from("matches")
    .insert({
      match_number: matchNumber,
      stage,
      group_name: groupName,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      home_placeholder: homePlaceholder,
      away_placeholder: awayPlaceholder,
      venue,
      city,
      country,
      kickoff_at: kickoffAt,
      locked_at: lockedAt,
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
