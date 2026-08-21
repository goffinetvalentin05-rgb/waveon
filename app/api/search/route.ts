import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { fetchProjects } from "@/lib/projects/server";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  const projects = await fetchProjects(supabase, user.id, true);
  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? null;

  const [projectHits, prospects, tasks, notes, expenses, subscriptions, events] = await Promise.all([
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
      .select("id, title, status, due_date, project_id, scope")
      .eq("user_id", user.id)
      .ilike("title", like)
      .limit(8),
    supabase
      .from("workspace_notes")
      .select("id, title, project_id, scope")
      .eq("user_id", user.id)
      .or(`title.ilike.${like},content.ilike.${like}`)
      .limit(8),
    supabase.from("expenses").select("id, title, amount, currency, project_id").eq("user_id", user.id).ilike("title", like).limit(8),
    supabase
      .from("finance_subscriptions")
      .select("id, name, amount, currency, project_id")
      .eq("user_id", user.id)
      .ilike("name", like)
      .limit(8),
    supabase
      .from("calendar_events")
      .select("id, title, start_at, project_id, scope")
      .eq("user_id", user.id)
      .ilike("title", like)
      .limit(8),
  ]);

  type Hit = {
    id: string;
    kind: string;
    label: string;
    href: string;
    context: string;
  };

  const results: Hit[] = [];

  for (const p of projectHits.data ?? []) {
    results.push({
      id: `project-${p.id}`,
      kind: "Projet",
      label: p.name,
      href: `/projects/${p.id}`,
      context: "Business",
    });
  }
  for (const p of prospects.data ?? []) {
    results.push({
      id: `prospect-${p.id}`,
      kind: "Prospect",
      label: p.club_name,
      href: `/crm/prospects/${p.id}`,
      context: projectName(p.project_id) ?? "Sans projet",
    });
  }
  for (const t of tasks.data ?? []) {
    const personal = t.scope === "personal";
    results.push({
      id: `task-${t.id}`,
      kind: "Tâche",
      label: t.title,
      href: personal ? "/personal/tasks" : t.project_id ? `/projects/${t.project_id}/tasks` : "/projects",
      context: personal ? "Personnel" : projectName(t.project_id) ?? "Sans projet",
    });
  }
  for (const n of notes.data ?? []) {
    const personal = n.scope === "personal";
    results.push({
      id: `note-${n.id}`,
      kind: "Note",
      label: n.title,
      href: personal
        ? `/personal/notes?id=${n.id}`
        : n.project_id
          ? `/projects/${n.project_id}/notes?id=${n.id}`
          : `/projects`,
      context: personal ? "Personnel" : projectName(n.project_id) ?? "Sans projet",
    });
  }
  for (const e of expenses.data ?? []) {
    results.push({
      id: `expense-${e.id}`,
      kind: "Dépense",
      label: e.title,
      href: e.project_id ? `/projects/${e.project_id}/finances` : "/projects",
      context: projectName(e.project_id) ?? "Sans projet",
    });
  }
  for (const s of subscriptions.data ?? []) {
    results.push({
      id: `sub-${s.id}`,
      kind: "Abonnement",
      label: s.name,
      href: s.project_id ? `/projects/${s.project_id}/finances` : "/projects",
      context: projectName(s.project_id) ?? "Sans projet",
    });
  }
  for (const e of events.data ?? []) {
    const personal = e.scope === "personal";
    results.push({
      id: `event-${e.id}`,
      kind: "Calendrier",
      label: e.title,
      href: personal
        ? "/personal/calendar"
        : e.project_id
          ? `/projects/${e.project_id}/calendar`
          : "/projects",
      context: personal ? "Personnel" : projectName(e.project_id) ?? "Sans projet",
    });
  }

  return NextResponse.json({ results });
}
