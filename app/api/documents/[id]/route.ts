import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in body) {
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    patch.title = title;
  }
  if ("url" in body) patch.url = String(body.url ?? "").trim() || null;
  if ("notes" in body) patch.notes = String(body.notes ?? "").trim() || null;

  const { data, error } = await supabase
    .from("project_documents")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ document: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id } = await params;
  const { error } = await supabase.from("project_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
