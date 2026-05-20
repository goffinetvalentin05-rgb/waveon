import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";
import { finalizeMatch } from "@/lib/pronoclash/match-finalize";
import { recalculateMatchPoints } from "@/lib/scoring/recalculate";

export const runtime = "nodejs";

type PatchBody = {
  homeScore?: unknown;
  awayScore?: unknown;
  status?: unknown;
  kickoffAt?: unknown;
  lockedAt?: unknown;
  recalculateOnly?: unknown;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  if (body.recalculateOnly === true) {
    try {
      const updated = await recalculateMatchPoints(guard.admin, id);
      return NextResponse.json({ ok: true, updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.kickoffAt != null) updates.kickoff_at = String(body.kickoffAt);
  if (body.lockedAt != null) updates.locked_at = String(body.lockedAt);

  const homeScore =
    body.homeScore !== undefined ? Number(body.homeScore) : undefined;
  const awayScore =
    body.awayScore !== undefined ? Number(body.awayScore) : undefined;
  const status =
    typeof body.status === "string" ? body.status : undefined;

  if (homeScore !== undefined) {
    if (!Number.isInteger(homeScore) || homeScore < 0) {
      return NextResponse.json({ error: "Score domicile invalide." }, { status: 400 });
    }
    updates.home_score = homeScore;
  }
  if (awayScore !== undefined) {
    if (!Number.isInteger(awayScore) || awayScore < 0) {
      return NextResponse.json({ error: "Score extérieur invalide." }, { status: 400 });
    }
    updates.away_score = awayScore;
  }
  if (status) {
    const allowed = ["scheduled", "live", "finished", "postponed", "cancelled"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    updates.status = status;
  }

  if (
    status === "finished" &&
    homeScore !== undefined &&
    awayScore !== undefined
  ) {
    try {
      const { updated } = await finalizeMatch(guard.admin, {
        matchId: id,
        homeScore,
        awayScore,
        forceStatus: "finished",
      });
      return NextResponse.json({ ok: true, updated, finalized: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (homeScore !== undefined || awayScore !== undefined) {
    updates.score_last_synced_at = new Date().toISOString();
  }

  const { error: upErr } = await guard.admin
    .from("matches")
    .update(updates)
    .eq("id", id);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { error } = await guard.admin.from("matches").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
