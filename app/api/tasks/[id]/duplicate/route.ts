import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: source, error } = await supabase
    .from("daily_tasks")
    .select("*, subtasks:task_subtasks(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!source) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: copy, error: insertError } = await supabase
    .from("daily_tasks")
    .insert({
      user_id: user.id,
      title: `${source.title} (copie)`,
      description: source.description,
      due_date: source.due_date,
      due_time: source.due_time,
      prospect_id: source.prospect_id,
      project_id: source.project_id,
      scope: source.scope ?? (source.project_id ? "project" : "personal"),
      assigned_to: source.assigned_to,
      task_kind: source.task_kind,
      priority: source.priority ?? "Normale",
      status: "À faire",
      notes: source.notes,
      completed: false,
    })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const subtasks = (source.subtasks ?? []) as { title: string; position: number }[];
  if (subtasks.length) {
    await supabase.from("task_subtasks").insert(
      subtasks.map((s) => ({
        user_id: user.id,
        task_id: copy.id,
        title: s.title,
        completed: false,
        position: s.position,
      }))
    );
  }

  return NextResponse.json({ task: copy }, { status: 201 });
}
