import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      projects: [],
      prospects: [],
      tasks: [],
      notes: [],
      expenses: [],
      subscriptions: [],
    });
  }

  const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

  const [projects, prospects, tasks, notes, expenses, subscriptions] = await Promise.all([
    supabase.from("projects").select("id, name, color, status").eq("user_id", user.id).ilike("name", like).limit(8),
    supabase
      .from("prospects")
      .select("id, club_name, status, project_id, contact_name")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .or(`club_name.ilike.${like},contact_name.ilike.${like},notes.ilike.${like}`)
      .limit(8),
    supabase
      .from("daily_tasks")
      .select("id, title, status, due_date, project_id")
      .eq("user_id", user.id)
      .ilike("title", like)
      .limit(8),
    supabase
      .from("workspace_notes")
      .select("id, title, project_id")
      .eq("user_id", user.id)
      .or(`title.ilike.${like},content.ilike.${like}`)
      .limit(8),
    supabase.from("expenses").select("id, title, amount, currency").eq("user_id", user.id).ilike("title", like).limit(8),
    supabase
      .from("finance_subscriptions")
      .select("id, name, amount, currency")
      .eq("user_id", user.id)
      .ilike("name", like)
      .limit(8),
  ]);

  return NextResponse.json({
    projects: projects.data ?? [],
    prospects: prospects.data ?? [],
    tasks: tasks.data ?? [],
    notes: notes.data ?? [],
    expenses: expenses.data ?? [],
    subscriptions: subscriptions.data ?? [],
  });
}
