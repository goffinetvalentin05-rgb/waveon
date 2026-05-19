import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  const countryCode =
    typeof body.countryCode === "string"
      ? body.countryCode.trim().toUpperCase().slice(0, 3) || null
      : null;
  const flagEmoji = typeof body.flagEmoji === "string" ? body.flagEmoji.trim() || null : null;
  const groupName = typeof body.groupName === "string" ? body.groupName.trim() || null : null;
  const isOutsider = body.isOutsider === true;
  const slug = slugify(name);

  const { data, error } = await guard.admin
    .from("teams")
    .insert({
      name,
      slug,
      country_code: countryCode,
      flag_emoji: flagEmoji,
      group_name: groupName,
      is_outsider: isOutsider,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
