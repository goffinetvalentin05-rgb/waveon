"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/design/tokens";
import { PROSPECT_STATUS_PHASES } from "@/lib/crm/types";
import { statusStyle } from "@/lib/crm/status";

type Stats = {
  total: number;
  contacted: number;
  replies: number;
  demos: number;
  clients: number;
  refus: number;
  potentialValue: number;
  wonValue: number;
  replyRate: number;
  contactToDemoRate: number;
  demoToClientRate: number;
  conversionRate: number;
  byStatus: Record<string, number>;
};

function chf(n: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
}

export function ProspectStats({ projectId }: { projectId?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const sp = projectId ? `?project=${projectId}` : "";
    void fetch(`/api/stats${sp}`)
      .then((r) => r.json())
      .then(setStats);
  }, [projectId]);

  if (!stats) return <p className="text-sm text-wo-dim">Chargement des statistiques…</p>;

  const cards = [
    { label: "Prospects", value: String(stats.total) },
    { label: "Contactés", value: String(stats.contacted ?? 0) },
    { label: "En discussion", value: String(stats.replies ?? 0) },
    { label: "Démos", value: String(stats.demos) },
    { label: "Clients", value: String(stats.clients) },
    { label: "Fermés", value: String(stats.refus) },
    { label: "Taux en discussion", value: `${stats.replyRate ?? 0}%` },
    { label: "Contact → démo", value: `${stats.contactToDemoRate ?? 0}%` },
    { label: "Démo → client", value: `${stats.demoToClientRate ?? 0}%` },
    { label: "Prospect → client", value: `${stats.conversionRate}%` },
    { label: "Potentiel", value: chf(stats.potentialValue ?? 0) },
    { label: "Gagné", value: chf(stats.wonValue ?? 0) },
  ];

  return (
    <div className="space-y-8">
      {projectId ? null : (
        <div>
          <h1 className={ui.h1}>Statistiques</h1>
          <p className="mt-1 text-sm text-wo-muted">Vue d&apos;ensemble de la prospection.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className={ui.statCard}>
            <p className="text-xs font-medium uppercase tracking-wide text-wo-muted">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-wo-text">{c.value}</p>
          </div>
        ))}
      </div>
      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Répartition par statut</h2>
        <ul className="mt-5 space-y-6">
          {PROSPECT_STATUS_PHASES.map((phase) => {
            const max = Math.max(1, ...phase.statuses.map((x) => stats.byStatus[x] ?? 0));
            return (
              <li key={phase.id}>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-wo-dim">
                  {phase.label}
                </p>
                <ul className="space-y-3">
                  {phase.statuses.map((s) => {
                    const n = stats.byStatus[s] ?? 0;
                    const style = statusStyle(s);
                    return (
                      <li key={s}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="flex items-center gap-2 text-wo-secondary">
                            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                            {s}
                          </span>
                          <span className="font-medium text-wo-text">{n}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-wo-hover">
                          <div className={`h-full rounded-full ${style.dot} opacity-80`} style={{ width: `${(n / max) * 100}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
