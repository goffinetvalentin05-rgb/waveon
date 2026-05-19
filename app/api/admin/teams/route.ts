import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2) return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  const shortCode = typeof body.shortCode === "string" ? body.shortCode.trim().toUpperCase().slice(0, 3) : null;
  const groupLabel = typeof body.groupLabel === "string" ? body.groupLabel.trim().slice(0, 4) : null;
  const isOutsider = body.isOutsider === true;

  const { data, error } = await guard.admin
    .from("teams")
    .insert({
      name,
      short_code: shortCode || null,
      group_label: groupLabel || null,
      is_outsider: isOutsider,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
