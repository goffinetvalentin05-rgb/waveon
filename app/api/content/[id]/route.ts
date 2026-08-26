import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { CONTENT_STATUSES, type ContentStatus } from "@/lib/content/types";

type Params = { params: Promise<{ id: string }> };

function isStatus(value: unknown): value is ContentStatus {
  return typeof value === "string" && (CONTENT_STATUSES as readonly string[]).includes(value);
}

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
  if ("body" in body) patch.body = String(body.body ?? "").trim() || null;
  if ("category" in body) patch.category = String(body.category ?? "").trim() || null;
  if ("platform" in body) patch.platform = String(body.platform ?? "").trim() || null;
  if ("status" in body) {
    if (!isStatus(body.status)) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    patch.status = body.status;
    if (body.status === "publié") patch.published_at = new Date().toISOString();
  }
  if ("scheduled_at" in body) patch.scheduled_at = body.scheduled_at ? String(body.scheduled_at) : null;

  const { data, error } = await supabase
    .from("content_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id } = await params;
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
