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
  if (typeof body.countryCode === "string" || body.countryCode === null)
    patch.country_code =
      body.countryCode === null
        ? null
        : (body.countryCode as string).trim().toUpperCase().slice(0, 3);
  if (typeof body.flagEmoji === "string" || body.flagEmoji === null)
    patch.flag_emoji = body.flagEmoji === null ? null : (body.flagEmoji as string).trim();
  if (typeof body.groupName === "string" || body.groupName === null)
    patch.group_name = body.groupName === null ? null : (body.groupName as string).trim() || null;
  if (typeof body.isOutsider === "boolean") patch.is_outsider = body.isOutsider;
  if (typeof body.isActive === "boolean") patch.is_active = body.isActive;
  if (typeof body.displayOrder === "number") patch.display_order = body.displayOrder;
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
