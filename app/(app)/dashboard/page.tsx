import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ensureTodayTasks } from "@/lib/crm/ensure-today-tasks";
import { TodayTaskList } from "@/components/crm/TodayTaskList";
import type { DailyTask } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

export default async function DashboardPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);
  await ensureTodayTasks(supabase, user.id, today);

  const [
    { count: followUps },
    { count: toContact },
    { count: demos },
    { count: clients },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_follow_up", today)
      .not("status", "in", '("Client","Refus")'),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "À contacter"),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "Démonstration"),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "Client"),
    supabase
      .from("daily_tasks")
      .select("*, prospect:prospects(id, club_name, status)")
      .eq("user_id", user.id)
      .eq("due_date", today)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const cards = [
    {
      label: "Relances aujourd'hui",
      value: followUps ?? 0,
      href: "/today",
      accent: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      label: "À contacter",
      value: toContact ?? 0,
      href: "/prospects",
      accent: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Démonstrations",
      value: demos ?? 0,
      href: "/today",
      accent: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Clients",
      value: clients ?? 0,
      href: "/clients",
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  const dateLabel = format(new Date(), "EEEE d MMMM", { locale: fr });

  return (
    <div className="space-y-8">
      <div className="crm-animate-in">
        <p className="text-sm font-medium capitalize text-slate-400">{dateLabel}</p>
        <h1 className={`${ui.h1} mt-1`}>Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Priorités du jour pour votre prospection.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 crm-animate-in-delay-1">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={`${ui.cardInteractive} p-5`}>
            <div className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${c.bg} ${c.accent}`}>
              {c.label}
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{c.value}</p>
          </Link>
        ))}
      </div>

      <section className="crm-animate-in-delay-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className={ui.h2}>À faire aujourd&apos;hui</h2>
          <Link href="/today" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Voir tout
          </Link>
        </div>
        <TodayTaskList tasks={(tasks ?? []) as DailyTask[]} />
      </section>
    </div>
  );
}
