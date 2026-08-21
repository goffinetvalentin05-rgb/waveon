import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/tasks/types";
import { parseScopeInput } from "@/lib/workspace/scope";

type Params = { params: Promise<{ id: string }> };

const TASK_SELECT =
  "*, prospect:prospects(id, club_name, status), project:projects(id, name, color), assignee:people!daily_tasks_assigned_to_fkey(id, name), subtasks:task_subtasks(*)";

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data, error } = await supabase
    .from("daily_tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ task: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if ("title" in body) {
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    patch.title = title;
  }
  if ("description" in body) patch.description = String(body.description ?? "").trim() || null;
  if ("due_date" in body) patch.due_date = body.due_date || null;
  if ("due_time" in body) patch.due_time = body.due_time || null;
  if ("project_id" in body || "scope" in body) {
    const scoped = parseScopeInput(body);
    patch.project_id = scoped.project_id;
    patch.scope = scoped.scope;
  }
  if ("assigned_to" in body) patch.assigned_to = body.assigned_to || null;
  if ("prospect_id" in body) patch.prospect_id = body.prospect_id || null;
  if ("notes" in body) patch.notes = String(body.notes ?? "").trim() || null;
  if ("priority" in body && TASK_PRIORITIES.includes(body.priority as TaskPriority)) {
    patch.priority = body.priority;
  }
  if ("status" in body && TASK_STATUSES.includes(body.status as TaskStatus)) {
    patch.status = body.status;
    patch.completed = body.status === "Terminé";
    patch.completed_at = body.status === "Terminé" ? new Date().toISOString() : null;
  }
  if ("completed" in body && !("status" in body)) {
    const completed = Boolean(body.completed);
    patch.completed = completed;
    patch.status = completed ? "Terminé" : "À faire";
    patch.completed_at = completed ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("daily_tasks")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(TASK_SELECT)
    .maybeSingle();

  if (error) {
    const fallback = await supabase
      .from("daily_tasks")
      .update({
        completed: Boolean(body.completed ?? patch.completed),
        completed_at: Boolean(body.completed ?? patch.completed) ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    return NextResponse.json({ task: fallback.data });
  }
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (Array.isArray(body.subtasks)) {
    await supabase.from("task_subtasks").delete().eq("task_id", id).eq("user_id", user.id);
    const rows = body.subtasks
      .map((s: { title?: string; completed?: boolean }, i: number) => ({
        user_id: user.id,
        task_id: id,
        title: String(s.title ?? "").trim(),
        completed: Boolean(s.completed),
        position: i,
      }))
      .filter((s: { title: string }) => s.title);
    if (rows.length) await supabase.from("task_subtasks").insert(rows);
  }

  if (data.status === "Terminé" && patch.status === "Terminé") {
    await logWorkspaceEvent(supabase, user.id, {
      event_type: "task_completed",
      title: `Tâche terminée : ${data.title}`,
      project_id: data.project_id,
      entity_type: "task",
      entity_id: data.id,
    });
  }

  return NextResponse.json({ task: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { error } = await supabase.from("daily_tasks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
