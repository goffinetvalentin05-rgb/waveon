import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ensureTodayTasks } from "@/lib/crm/ensure-today-tasks";
import { TodayTaskList } from "@/components/crm/TodayTaskList";
import type { DailyTask } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

export default async function TodayPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);
  await ensureTodayTasks(supabase, user.id, today);

  const { data: tasks } = await supabase
    .from("daily_tasks")
    .select("*, prospect:prospects(id, club_name, status)")
    .eq("user_id", user.id)
    .eq("due_date", today)
    .order("completed", { ascending: true })
    .order("created_at", { ascending: true });

  const dateLabel = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });
  const openCount = (tasks ?? []).filter((t) => !t.completed).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="crm-animate-in">
        <p className="text-sm font-medium capitalize text-slate-400">{dateLabel}</p>
        <h1 className={`${ui.h1} mt-1`}>Aujourd&apos;hui</h1>
        <p className="mt-1 text-sm text-slate-500">
          {openCount === 0
            ? "Tout est fait pour aujourd'hui."
            : `${openCount} action${openCount > 1 ? "s" : ""} à traiter.`}
        </p>
      </div>

      <div className="crm-animate-in-delay-1">
        <TodayTaskList
          tasks={(tasks ?? []) as DailyTask[]}
          emptyLabel="Aucune action prévue. Importez des prospects ou planifiez une relance."
        />
      </div>

      <p className="text-center text-sm text-slate-400">
        <Link href="/prospects" className="text-blue-600 hover:underline">
          Voir tous les prospects
        </Link>
      </p>
    </div>
  );
}
