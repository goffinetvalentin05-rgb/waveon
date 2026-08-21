import { notFound } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { fetchProjects } from "@/lib/projects/server";
import { ProjectOverview } from "@/components/projects/ProjectOverview";
import { monthlyAmount } from "@/lib/finance/types";
import type { FinanceSubscription } from "@/lib/finance/types";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const projects = await fetchProjects(supabase, user.id, true);
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [prospectsRes, tasksRes, expensesRes, subsRes, calendarRes, notesRes] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, status, next_follow_up, potential_value")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .is("archived_at", null),
    supabase
      .from("daily_tasks")
      .select("id, title, due_date, status, priority")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .eq("scope", "project")
      .neq("status", "Terminé")
      .order("due_date", { ascending: true })
      .limit(8),
    supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .gte("expense_date", monthStart),
    supabase
      .from("finance_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .eq("status", "active"),
    supabase
      .from("calendar_events")
      .select("id, title, start_at")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .eq("scope", "project")
      .gte("end_at", now)
      .order("start_at", { ascending: true })
      .limit(6),
    supabase
      .from("workspace_notes")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const prospects = prospectsRes.data ?? [];
  const followUps = prospects.filter(
    (p) => p.next_follow_up && p.next_follow_up <= today && p.status !== "Client" && p.status !== "Refusé"
  ).length;
  const monthSpend = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthlySubs = ((subsRes.data as FinanceSubscription[] | null) ?? []).reduce(
    (s, sub) => s + monthlyAmount(sub),
    0
  );

  return (
    <ProjectOverview
      projectId={id}
      projectName={project.name}
      enabledModules={project.enabledModules}
      stats={{
        prospects: prospects.length,
        followUps,
        openTasks: (tasksRes.data ?? []).length,
        monthSpend,
        monthlySubs,
      }}
      tasks={tasksRes.data ?? []}
      calendarEvents={calendarRes.data ?? []}
      notes={notesRes.data ?? []}
    />
  );
}
