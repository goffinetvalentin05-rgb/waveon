"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ui } from "@/lib/design/tokens";

function chf(n: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
}

export function ProjectOverview({
  stats,
  tasks,
  events,
}: {
  stats: {
    prospects: number;
    clients: number;
    conversion: number;
    potential: number;
    followUps: number;
    openTasks: number;
    monthSpend: number;
    monthlySubs: number;
  };
  tasks: { id: string; title: string; due_date: string; status: string; priority: string }[];
  events: { id: string; title: string; created_at: string }[];
}) {
  const cards = [
    { label: "Prospects", value: String(stats.prospects) },
    { label: "Clients", value: String(stats.clients) },
    { label: "Conversion", value: `${stats.conversion}%` },
    { label: "Potentiel", value: chf(stats.potential) },
    { label: "Relances", value: String(stats.followUps) },
    { label: "Tâches ouvertes", value: String(stats.openTasks) },
    { label: "Dépenses du mois", value: chf(stats.monthSpend) },
    { label: "Abos / mois", value: chf(stats.monthlySubs) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={ui.statCard}>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8b869c]">{c.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-[#f3f0fa]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${ui.widget} p-5`}>
          <h2 className={ui.h2}>Prochaines échéances</h2>
          {tasks.length === 0 ? (
            <p className="mt-4 text-sm text-[#6a6578]">Aucune tâche ouverte.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-[#f3f0fa]">{t.title}</span>
                  <span className="shrink-0 text-xs text-[#8b869c]">
                    {format(new Date(`${t.due_date}T12:00:00`), "d MMM", { locale: fr })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/tasks" className={`${ui.link} mt-4 inline-block text-sm`}>
            Voir les tâches
          </Link>
        </section>
        <section className={`${ui.widget} p-5`}>
          <h2 className={ui.h2}>Activité récente</h2>
          {events.length === 0 ? (
            <p className="mt-4 text-sm text-[#6a6578]">Pas encore d&apos;activité.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {events.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="text-[#e8e4f0]">{e.title}</p>
                  <p className="text-[11px] text-[#6a6578]">
                    {format(new Date(e.created_at), "d MMM HH:mm", { locale: fr })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
