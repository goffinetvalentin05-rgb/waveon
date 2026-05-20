import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";
import { recalculateMatchPoints } from "@/lib/scoring/recalculate";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;

  try {
    const updated = await recalculateMatchPoints(guard.admin, id);
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de recalcul.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
