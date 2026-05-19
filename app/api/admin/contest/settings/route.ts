import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = {
    prize_title:
      typeof body.prize_title === "string" ? body.prize_title.trim() : undefined,
    prize_description:
      typeof body.prize_description === "string" ? body.prize_description.trim() : undefined,
    prize_value_chf:
      typeof body.prize_value_chf === "number" ? body.prize_value_chf : undefined,
    starts_at: body.starts_at === null ? null : (body.starts_at as string | undefined),
    ends_at: body.ends_at === null ? null : (body.ends_at as string | undefined),
    is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    rules_url: body.rules_url === null ? null : (body.rules_url as string | undefined),
    tie_break_rules: Array.isArray(body.tie_break_rules)
      ? (body.tie_break_rules as string[])
      : undefined,
  };

  const cleanPayload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) cleanPayload[k] = v;
  }

  // Récupérer la ligne existante
  const { data: existing } = await guard.admin
    .from("contest_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await guard.admin
      .from("contest_settings")
      .update(cleanPayload)
      .eq("id", (existing as { id: string }).id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await guard.admin.from("contest_settings").insert(cleanPayload);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
