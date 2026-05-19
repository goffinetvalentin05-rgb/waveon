import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";
import { finalizeMatch } from "@/lib/pronoclash/match-finalize";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);
  if (!Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) {
    return NextResponse.json({ error: "Scores invalides." }, { status: 400 });
  }
  try {
    const { updated } = await finalizeMatch(guard.admin, {
      matchId: id,
      homeScore,
      awayScore,
    });
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de finalisation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
