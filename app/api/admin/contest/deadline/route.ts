import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const deadline = typeof body.deadline === "string" ? body.deadline : null;
  if (deadline && Number.isNaN(new Date(deadline).getTime())) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  const { error } = await guard.admin
    .from("app_settings")
    .upsert(
      {
        key: "tournament_predictions_deadline",
        value: { deadline },
      },
      { onConflict: "key" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
