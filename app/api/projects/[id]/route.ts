import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { replaceProjectModules } from "@/lib/projects/server";
import { normalizeModules, type ProjectModuleKey } from "@/lib/projects/modules";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ project: data });
}

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
  if ("description" in body) patch.description = String(body.description ?? "").trim() || null;
  if ("icon" in body) patch.icon = String(body.icon ?? "").trim() || null;
  if ("color" in body) patch.color = String(body.color ?? "").trim() || null;
  if ("status" in body) patch.status = body.status === "archived" ? "archived" : "active";

  const { data, error } = await supabase
    .from("projects")
    .update(Object.keys(patch).length ? patch : { updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let enabledModules: ProjectModuleKey[] | undefined;
  if ("modules" in body) {
    enabledModules = await replaceProjectModules(supabase, user.id, id, normalizeModules(body.modules));
  }

  return NextResponse.json({ project: { ...data, enabledModules } });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
