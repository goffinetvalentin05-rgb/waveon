import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = typeof body.userId === "string" ? body.userId : "";
  const manual = body.manual === true;
  if (!userId) return NextResponse.json({ error: "userId requis." }, { status: 400 });

  // Réinitialiser les anciens gagnants
  await guard.admin
    .from("contest_results")
    .update({ is_winner: false, winner_selected_manually: false })
    .neq("user_id", userId);

  // Upsert ce gagnant
  const { error } = await guard.admin
    .from("contest_results")
    .upsert(
      {
        user_id: userId,
        is_winner: true,
        winner_selected_manually: manual,
      },
      { onConflict: "user_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
