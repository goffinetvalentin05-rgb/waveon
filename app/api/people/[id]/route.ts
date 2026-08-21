import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if ("name" in body) {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    patch.name = name;
  }
  if ("email" in body) patch.email = String(body.email ?? "").trim() || null;
  if ("avatar" in body) patch.avatar = String(body.avatar ?? "").trim() || null;
  if ("role" in body) patch.role = String(body.role ?? "").trim() || null;
  if ("is_self" in body) patch.is_self = Boolean(body.is_self);

  const { data, error } = await supabase
    .from("people")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ person: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { error } = await supabase.from("people").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
