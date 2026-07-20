import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: prospect, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ prospect, activities: activities ?? [] });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "club_name",
    "sport",
    "canton",
    "contact_name",
    "phone",
    "email",
    "website",
    "status",
    "notes",
    "next_follow_up",
    "demo_at",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      const val = body[key];
      patch[key] = typeof val === "string" ? val.trim() || null : val;
    }
  }

  if (patch.club_name === null || patch.club_name === "") {
    return NextResponse.json({ error: "Nom du club requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("prospects")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (body.notes !== undefined && typeof body.notes === "string" && body.notes.trim()) {
    // optional: don't spam history on every note save
  }

  return NextResponse.json({ prospect: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { error } = await supabase
    .from("prospects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
