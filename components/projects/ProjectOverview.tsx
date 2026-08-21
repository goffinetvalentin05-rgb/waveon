"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ui } from "@/lib/design/tokens";
import { hasModule, type ProjectModuleKey } from "@/lib/projects/modules";

function chf(n: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
}

export function ProjectOverview({
  projectId,
  projectName,
  enabledModules,
  stats,
  tasks,
  calendarEvents,
  notes,
}: {
  projectId: string;
  projectName: string;
  enabledModules?: ProjectModuleKey[];
  stats: {
    prospects: number;
    followUps: number;
    openTasks: number;
    monthSpend: number;
    monthlySubs: number;
  };
  tasks: { id: string; title: string; due_date: string; status: string; priority: string }[];
  calendarEvents: { id: string; title: string; start_at: string }[];
  notes: { id: string; title: string; updated_at: string }[];
}) {
  const base = `/projects/${projectId}`;
  const cards = [
    hasModule(enabledModules, "tasks")
      ? { label: "Tâches restantes", value: String(stats.openTasks), href: `${base}/tasks` }
      : null,
    hasModule(enabledModules, "prospects")
      ? { label: "Prospects à relancer", value: String(stats.followUps), href: `${base}/prospects` }
      : null,
    hasModule(enabledModules, "calendar")
      ? { label: "Prochains rendez-vous", value: String(calendarEvents.length), href: `${base}/calendar` }
      : null,
    hasModule(enabledModules, "finances")
      ? { label: "Dépenses du mois", value: chf(stats.monthSpend), href: `${base}/finances` }
      : null,
  ].filter(Boolean) as { label: string; value: string; href: string }[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[1.35rem] font-semibold tracking-tight text-[#eef6f2]">{projectName}</h2>
        <p className="mt-1 text-sm text-[#8a9e96]">Voici ce qui demande votre attention.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={ui.statCard}>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8a9e96]">{c.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-[#eef6f2]">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {hasModule(enabledModules, "tasks") ? (
          <section className={`${ui.widget} p-5`}>
            <h2 className={ui.h2}>Tâches</h2>
            {tasks.length === 0 ? (
              <p className="mt-4 text-sm text-[#6b7d76]">Aucune tâche ouverte.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[#eef6f2]">{t.title}</span>
                    <span className="shrink-0 text-xs text-[#8a9e96]">
                      {format(new Date(`${t.due_date}T12:00:00`), "d MMM", { locale: fr })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`${base}/tasks`} className={`${ui.link} mt-4 inline-block text-sm`}>
              Voir les tâches
            </Link>
          </section>
        ) : null}

        {hasModule(enabledModules, "calendar") ? (
          <section className={`${ui.widget} p-5`}>
            <h2 className={ui.h2}>Prochains rendez-vous</h2>
            {calendarEvents.length === 0 ? (
              <p className="mt-4 text-sm text-[#6b7d76]">Rien de prévu.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {calendarEvents.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="text-[#dce8e3]">{e.title}</p>
                    <p className="text-[11px] text-[#6b7d76]">
                      {format(new Date(e.start_at), "d MMM HH:mm", { locale: fr })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`${base}/calendar`} className={`${ui.link} mt-4 inline-block text-sm`}>
              Ouvrir le calendrier
            </Link>
          </section>
        ) : null}

        {hasModule(enabledModules, "notes") ? (
          <section className={`${ui.widget} p-5`}>
            <h2 className={ui.h2}>Dernières notes</h2>
            {notes.length === 0 ? (
              <p className="mt-4 text-sm text-[#6b7d76]">Aucune note.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="text-sm text-[#dce8e3]">
                    {n.title || "Sans titre"}
                  </li>
                ))}
              </ul>
            )}
            <Link href={`${base}/notes`} className={`${ui.link} mt-4 inline-block text-sm`}>
              Voir les notes
            </Link>
          </section>
        ) : null}

        {hasModule(enabledModules, "finances") ? (
          <section className={`${ui.widget} p-5`}>
            <h2 className={ui.h2}>Finances</h2>
            <p className="mt-4 text-sm text-[#c2d4cc]">Abonnements : {chf(stats.monthlySubs)} / mois</p>
            <Link href={`${base}/finances`} className={`${ui.link} mt-4 inline-block text-sm`}>
              Ouvrir les finances
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}
