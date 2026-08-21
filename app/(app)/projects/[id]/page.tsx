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
  void project;

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [prospectsRes, tasksRes, expensesRes, subsRes, eventsRes] = await Promise.all([
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
      .from("workspace_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const prospects = prospectsRes.data ?? [];
  const clients = prospects.filter((p) => p.status === "Client").length;
  const followUps = prospects.filter(
    (p) => p.next_follow_up && p.next_follow_up <= today && p.status !== "Client" && p.status !== "Refusé"
  ).length;
  const potential = prospects.reduce((s, p) => s + (Number(p.potential_value) || 0), 0);
  const conversion = prospects.length ? Math.round((clients / prospects.length) * 1000) / 10 : 0;
  const monthSpend = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthlySubs = (subsRes.data as FinanceSubscription[] | null ?? []).reduce(
    (s, sub) => s + monthlyAmount(sub),
    0
  );

  return (
    <ProjectOverview
        stats={{
          prospects: prospects.length,
          clients,
          conversion,
          potential,
          followUps,
          openTasks: (tasksRes.data ?? []).length,
          monthSpend,
          monthlySubs,
        }}
        tasks={tasksRes.data ?? []}
        events={eventsRes.data ?? []}
      />
  );
}
