import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { requireUser, todayISO } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/tasks/types";
import { parseScopeInput } from "@/lib/workspace/scope";

const TASK_SELECT =
  "*, prospect:prospects(id, club_name, status), project:projects(id, name, color), assignee:people!daily_tasks_assigned_to_fkey(id, name), subtasks:task_subtasks(*)";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "today";
  const projectId = url.searchParams.get("project");
  const scope = url.searchParams.get("scope");
  const today = todayISO();
  const weekEnd = addDays(new Date(`${today}T12:00:00`), 7).toISOString().slice(0, 10);

  let query = supabase
    .from("daily_tasks")
    .select(TASK_SELECT)
    .eq("user_id", user.id)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (scope === "personal") {
    query = query.eq("scope", "personal");
  } else if (projectId === "unassigned") {
    query = query.eq("scope", "project").is("project_id", null);
  } else if (projectId) {
    query = query.eq("scope", "project").eq("project_id", projectId);
  } else {
    query = query.eq("scope", "project");
  }

  if (view === "today") {
    query = query.eq("due_date", today).neq("status", "Terminé");
  } else if (view === "week") {
    query = query.gte("due_date", today).lte("due_date", weekEnd).neq("status", "Terminé");
  } else if (view === "upcoming") {
    query = query.gt("due_date", today).neq("status", "Terminé");
  } else if (view === "overdue") {
    query = query.lt("due_date", today).neq("status", "Terminé");
  } else if (view === "done") {
    query = query.eq("status", "Terminé").order("completed_at", { ascending: false });
  } else if (view === "kanban" || view === "all") {
    // no extra filter
  }

  const { data, error } = await query;
  if (error) {
    const fallback = await supabase
      .from("daily_tasks")
      .select("*, prospect:prospects(id, club_name, status)")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    return NextResponse.json({ tasks: fallback.data ?? [], todayISO: today });
  }

  return NextResponse.json({ tasks: data ?? [], todayISO: today });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const priority = TASK_PRIORITIES.includes(body.priority as TaskPriority)
    ? (body.priority as TaskPriority)
    : "Normale";
  const status = TASK_STATUSES.includes(body.status as TaskStatus)
    ? (body.status as TaskStatus)
    : "À faire";

  const scoped = parseScopeInput(body);

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert({
      user_id: user.id,
      title,
      description: String(body.description ?? "").trim() || null,
      due_date: body.due_date || todayISO(),
      due_time: body.due_time || null,
      prospect_id: body.prospect_id || null,
      project_id: scoped.project_id,
      scope: scoped.scope,
      assigned_to: body.assigned_to || null,
      task_kind: body.task_kind || "custom",
      priority,
      status,
      notes: String(body.notes ?? "").trim() || null,
      completed: status === "Terminé",
    })
    .select(TASK_SELECT)
    .single();

  if (error) {
    const simple = await supabase
      .from("daily_tasks")
      .insert({
        user_id: user.id,
        title,
        due_date: body.due_date || todayISO(),
        prospect_id: body.prospect_id || null,
        task_kind: body.task_kind || "custom",
      })
      .select("*")
      .single();
    if (simple.error) return NextResponse.json({ error: simple.error.message }, { status: 500 });
    return NextResponse.json({ task: simple.data }, { status: 201 });
  }

  const subtasks: string[] = Array.isArray(body.subtasks)
    ? body.subtasks.map((s: unknown) => String(s).trim()).filter(Boolean)
    : [];
  if (subtasks.length && data) {
    await supabase.from("task_subtasks").insert(
      subtasks.map((title, i) => ({
        user_id: user.id,
        task_id: data.id,
        title,
        position: i,
      }))
    );
  }

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "task_created",
    title: `Tâche créée : ${title}`,
    project_id: scoped.project_id,
    entity_type: "task",
    entity_id: data.id,
  });

  return NextResponse.json({ task: data }, { status: 201 });
}
