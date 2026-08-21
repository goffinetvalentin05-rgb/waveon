import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const projectId = new URL(request.url).searchParams.get("project");

  let query = supabase
    .from("workspace_notes")
    .select("*, project:projects(id, name, color)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const title = String(body.title ?? "").trim() || "Sans titre";
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
    : typeof body.tags === "string"
      ? body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

  const { data, error } = await supabase
    .from("workspace_notes")
    .insert({
      user_id: user.id,
      title,
      content: String(body.content ?? ""),
      project_id: body.project_id || null,
      tags,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
