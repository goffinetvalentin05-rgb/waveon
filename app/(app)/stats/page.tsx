"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/design/tokens";
import { PROSPECT_STATUSES } from "@/lib/crm/types";
import { statusStyle } from "@/lib/crm/status";

type Stats = {
  total: number;
  clients: number;
  demos: number;
  refus: number;
  mails: number;
  calls: number;
  demosDone: number;
  conversionRate: number;
  byStatus: Record<string, number>;
  activityByDay: { date: string; count: number }[];
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return <p className="text-sm text-slate-400">Chargement des statistiques…</p>;
  }

  const cards = [
    { label: "Prospects", value: stats.total },
    { label: "Mails envoyés", value: stats.mails },
    { label: "Appels", value: stats.calls },
    { label: "Démonstrations", value: stats.demosDone },
    { label: "Clients", value: stats.clients },
    { label: "Taux de conversion", value: `${stats.conversionRate}%` },
  ];

  const maxDay = Math.max(1, ...stats.activityByDay.map((d) => d.count));
  const maxStatus = Math.max(
    1,
    ...PROSPECT_STATUSES.map((s) => stats.byStatus[s] ?? 0)
  );

  return (
    <div className="space-y-8">
      <div className="crm-animate-in">
        <h1 className={ui.h1}>Statistiques</h1>
        <p className="mt-1 text-sm text-slate-500">Vue d&apos;ensemble de votre prospection.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 crm-animate-in-delay-1">
        {cards.map((c) => (
          <div key={c.label} className={`${ui.card} p-5`}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {c.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2 crm-animate-in-delay-2">
        <section className={`${ui.card} p-5 sm:p-6`}>
          <h2 className={ui.h2}>Répartition par statut</h2>
          <ul className="mt-5 space-y-3">
            {PROSPECT_STATUSES.map((s) => {
              const n = stats.byStatus[s] ?? 0;
              const pct = (n / maxStatus) * 100;
              const style = statusStyle(s);
              return (
                <li key={s}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                      {s}
                    </span>
                    <span className="font-medium text-slate-900">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${style.dot} opacity-80 transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={`${ui.card} p-5 sm:p-6`}>
          <h2 className={ui.h2}>Activité (30 jours)</h2>
          <div className="mt-5 flex h-40 items-end gap-1">
            {stats.activityByDay.map((d) => (
              <div
                key={d.date}
                className="group relative flex-1 rounded-t-sm bg-blue-500/80 transition hover:bg-blue-600"
                style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                title={`${d.date}: ${d.count}`}
              >
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>il y a 30 j</span>
            <span>aujourd&apos;hui</span>
          </div>
        </section>
      </div>
    </div>
  );
}
