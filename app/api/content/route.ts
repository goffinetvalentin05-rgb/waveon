import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { CONTENT_STATUSES, type ContentStatus } from "@/lib/content/types";

function isStatus(value: unknown): value is ContentStatus {
  return typeof value === "string" && (CONTENT_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const projectId = new URL(request.url).searchParams.get("project");
  if (!projectId) {
    return NextResponse.json({ error: "project requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const projectId = String(body.project_id ?? "").trim();
  const title = String(body.title ?? "").trim();
  if (!projectId) return NextResponse.json({ error: "project_id requis" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const status = isStatus(body.status) ? body.status : "idée";
  const { data, error } = await supabase
    .from("content_items")
    .insert({
      user_id: user.id,
      project_id: projectId,
      title,
      body: String(body.body ?? "").trim() || null,
      category: String(body.category ?? "").trim() || null,
      platform: String(body.platform ?? "").trim() || null,
      status,
      scheduled_at: body.scheduled_at ? String(body.scheduled_at) : null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "content_created",
    title: `Idée de contenu : ${title}`,
    project_id: projectId,
    entity_type: "content",
    entity_id: data.id,
  });

  return NextResponse.json({ item: data }, { status: 201 });
}
