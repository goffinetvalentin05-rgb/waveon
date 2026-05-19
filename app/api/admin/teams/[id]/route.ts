import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.shortCode === "string" || body.shortCode === null)
    patch.short_code = body.shortCode === null ? null : (body.shortCode as string).trim().toUpperCase().slice(0, 3);
  if (typeof body.groupLabel === "string" || body.groupLabel === null)
    patch.group_label = body.groupLabel === null ? null : (body.groupLabel as string).trim().slice(0, 4);
  if (typeof body.isOutsider === "boolean") patch.is_outsider = body.isOutsider;
  const { error } = await guard.admin.from("teams").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { error } = await guard.admin.from("teams").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
