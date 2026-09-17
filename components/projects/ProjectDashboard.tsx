"use client";

import Link from "next/link";
import {
  IconChecklist,
  IconPlus,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { hasModule, type ProjectModuleKey } from "@/lib/projects/modules";
import { ActivityChart } from "@/components/crm/ActivityChart";
import { PipelineFunnel } from "@/components/crm/PipelineFunnel";
import { StatusBadge } from "@/components/crm/StatusBadge";
import {
  formatChf,
  type ActivityPoint,
  type PipelineStageCount,
} from "@/lib/crm/dashboard";

type TodayItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
  tone?: "overdue" | "today" | "neutral";
};

type FollowUpItem = {
  id: string;
  href: string;
  name: string;
  status: string;
  when: string;
};

type RecentItem = {
  id: string;
  href: string;
  title: string;
  when: string;
};

export function ProjectDashboard({
  projectId,
  enabledModules,
  kpis,
  stages,
  series7,
  series30,
  series90,
  todayItems,
  followUps,
  recent,
}: {
  projectId: string;
  enabledModules?: ProjectModuleKey[];
  kpis: {
    prospects: number;
    toContact: number;
    followUps: number;
    meetings: number;
    clients: number;
    potentialValue: number;
  };
  stages: PipelineStageCount[];
  series7: ActivityPoint[];
  series30: ActivityPoint[];
  series90: ActivityPoint[];
  todayItems: TodayItem[];
  followUps: FollowUpItem[];
  recent: RecentItem[];
}) {
  const base = `/projects/${projectId}`;
  const prospecting = hasModule(enabledModules, "prospects");

  const kpiCards = [
    { label: "Prospects", value: String(kpis.prospects), href: `${base}/prospects` },
    { label: "À contacter", value: String(kpis.toContact), href: `${base}/prospects?status=${encodeURIComponent("À contacter")}` },
    { label: "Relances", value: String(kpis.followUps), href: `${base}/prospects` },
    { label: "Rendez-vous", value: String(kpis.meetings), href: `${base}/prospects?status=${encodeURIComponent("Démo")}` },
    { label: "Clients", value: String(kpis.clients), href: `${base}/clients` },
    ...(kpis.potentialValue > 0
      ? [{ label: "Valeur potentielle", value: formatChf(kpis.potentialValue), href: `${base}/stats` }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {prospecting ? (
          <Link href={`${base}/prospects`} className={ui.btnPrimary}>
            <IconPlus className="h-4 w-4" />
            Ajouter un prospect
          </Link>
        ) : null}
        {hasModule(enabledModules, "tasks") ? (
          <Link href={`${base}/tasks`} className={ui.btnSecondary}>
            <IconChecklist className="h-4 w-4" />
            Tâche
          </Link>
        ) : null}
      </div>

      {prospecting ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {kpiCards.map((card) => (
            <Link key={card.label} href={card.href} className="wo-stat">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-wo-dim">{card.label}</p>
              <p className="mt-1.5 font-display text-xl font-semibold tabular-nums tracking-tight text-wo-text">
                {card.value}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <section className="wo-widget p-6">
          <p className="text-sm text-wo-muted">
            Activez le module Prospects dans les paramètres du projet pour suivre la prospection ici.
          </p>
        </section>
      )}

      {prospecting ? (
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <ActivityChart series7={series7} series30={series30} series90={series90} />
          </div>
          <div className="xl:col-span-2">
            <PipelineFunnel stages={stages} projectId={projectId} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="wo-widget p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-wo-text">Aujourd&apos;hui</h2>
            {hasModule(enabledModules, "calendar") ? (
              <Link href={`${base}/calendar`} className="text-[12px] font-medium text-wo-accent">
                Calendrier
              </Link>
            ) : null}
          </div>
          {todayItems.length === 0 ? (
            <p className="py-6 text-sm text-wo-dim">Rien d&apos;urgent pour aujourd&apos;hui.</p>
          ) : (
            <ul className="space-y-1">
              {todayItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start justify-between gap-3 rounded-lg px-2 py-2 hover:bg-wo-hover"
                  >
                    <span>
                      <span className="block text-[13px] font-medium text-wo-text">{item.title}</span>
                      <span
                        className={`mt-0.5 block text-[11px] ${
                          item.tone === "overdue"
                            ? "text-rose-300"
                            : item.tone === "today"
                              ? "text-amber-300"
                              : "text-wo-dim"
                        }`}
                      >
                        {item.meta}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="wo-widget p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-wo-text">Prochaines relances</h2>
            <Link href={`${base}/prospects`} className="text-[12px] font-medium text-wo-accent">
              Prospects
            </Link>
          </div>
          {followUps.length === 0 ? (
            <p className="py-6 text-sm text-wo-dim">Aucune relance programmée.</p>
          ) : (
            <ul className="space-y-1">
              {followUps.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-wo-hover"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-wo-text">{item.name}</span>
                      <span className="mt-1 block">
                        <StatusBadge status={item.status} />
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-wo-muted">{item.when}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="wo-widget p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-wo-text">Activité récente</h2>
            {hasModule(enabledModules, "activity") ? (
              <Link href={`${base}/activity`} className="text-[12px] font-medium text-wo-accent">
                Historique
              </Link>
            ) : null}
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-sm text-wo-dim">Les actions apparaîtront ici.</p>
          ) : (
            <ul className="space-y-1">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start justify-between gap-3 rounded-lg px-2 py-2 hover:bg-wo-hover"
                  >
                    <span className="text-[13px] text-wo-text">{item.title}</span>
                    <span className="shrink-0 text-[11px] text-wo-dim">{item.when}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
