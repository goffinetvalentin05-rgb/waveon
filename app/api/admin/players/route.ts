import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (fullName.length < 2)
    return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
  const teamId = typeof body.teamId === "string" && body.teamId.length > 0 ? body.teamId : null;
  const { data, error } = await guard.admin
    .from("players")
    .insert({ full_name: fullName, team_id: teamId })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
