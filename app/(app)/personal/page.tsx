import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconCalendarEvent,
  IconChecklist,
  IconLanguage,
  IconNote,
} from "@tabler/icons-react";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

export default async function PersonalHomePage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString();
  const [tasks, event] = await Promise.all([
    supabase
      .from("daily_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("scope", "personal")
      .neq("status", "Terminé"),
    supabase
      .from("calendar_events")
      .select("title, start_at")
      .eq("user_id", user.id)
      .eq("scope", "personal")
      .gte("end_at", today)
      .order("start_at", { ascending: true })
      .limit(1),
  ]);

  const next = event.data?.[0];

  const modules = [
    { href: "/personal/calendar", label: "Calendrier", icon: IconCalendarEvent, hint: "Agenda et anniversaires" },
    { href: "/personal/tasks", label: "Tâches", icon: IconChecklist, hint: `${tasks.count ?? 0} ouverte(s)` },
    { href: "/personal/english", label: "Anglais", icon: IconLanguage, hint: "Vocabulaire et flashcards" },
    { href: "/personal/notes", label: "Notes", icon: IconNote, hint: "Notes personnelles" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-violet-300/80">Personnel</p>
        <h1 className={ui.h1}>Mon espace</h1>
        <p className="mt-1 text-sm text-[#8b869c]">Uniquement vos outils personnels.</p>
        {next ? (
          <p className="mt-3 text-sm text-[#c8c3d6]">
            Prochain événement : {next.title} ·{" "}
            {format(new Date(next.start_at), "d MMM HH:mm", { locale: fr })}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href} className={`${ui.cardInteractive} p-5`}>
              <Icon className="h-5 w-5 text-violet-300" />
              <h2 className="mt-3 text-base font-semibold text-[#f3f0fa]">{m.label}</h2>
              <p className="mt-1 text-sm text-[#8b869c]">{m.hint}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
