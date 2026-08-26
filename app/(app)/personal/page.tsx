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
        <p className={ui.kicker}>Personnel</p>
        <h1 className={`${ui.h1} mt-2`}>Mon espace</h1>
        <p className="mt-1 text-sm text-wo-muted">Uniquement vos outils personnels.</p>
        {next ? (
          <p className="mt-3 text-sm text-wo-secondary">
            Prochain événement : {next.title} ·{" "}
            {format(new Date(next.start_at), "d MMM HH:mm", { locale: fr })}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {modules.map((m, i) => {
          const Icon = m.icon;
          const variant = i === 0 ? "featured" : i === 2 ? "cta" : "quiet";
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`${
                variant === "featured"
                  ? ui.cardFeatured
                  : variant === "cta"
                    ? ui.cardCta
                    : ui.cardInteractive
              } flex min-h-[150px] flex-col justify-between p-5`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  variant === "cta"
                    ? "bg-black/10 text-[#0a0a0a]"
                    : variant === "featured"
                      ? "bg-white/10 text-white"
                      : "bg-indigo-50 text-indigo-600"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h2
                  className={`mt-4 font-display text-base font-semibold ${
                    variant === "cta" ? "text-[#0a0a0a]" : "text-wo-text"
                  }`}
                >
                  {m.label}
                </h2>
                <p className={`mt-1 text-sm ${variant === "cta" ? "text-black/55" : "text-wo-muted"}`}>
                  {m.hint}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
