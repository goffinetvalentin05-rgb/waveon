import { NextResponse } from "next/server";
import { requireUser, todayISO } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if ("title" in body) patch.title = String(body.title ?? "").trim() || "Sans titre";
  if ("content" in body) patch.content = String(body.content ?? "");
  if ("project_id" in body) patch.project_id = body.project_id || null;
  if ("tags" in body) {
    patch.tags = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];
  }

  const { data, error } = await supabase
    .from("workspace_notes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ note: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const { error } = await supabase.from("workspace_notes").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body?.action !== "convert") {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const { data: note, error } = await supabase
    .from("workspace_notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!note) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: task, error: taskError } = await supabase
    .from("daily_tasks")
    .insert({
      user_id: user.id,
      title: note.title || "Tâche",
      description: note.content || null,
      project_id: note.project_id,
      due_date: todayISO(),
      task_kind: "custom",
      priority: "Normale",
      status: "À faire",
    })
    .select("*")
    .single();

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "task_created",
    title: `Tâche créée depuis une note : ${task.title}`,
    project_id: note.project_id,
    entity_type: "task",
    entity_id: task.id,
  });

  return NextResponse.json({ task }, { status: 201 });
}
