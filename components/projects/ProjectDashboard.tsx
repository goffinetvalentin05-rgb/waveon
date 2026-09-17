"use client";

import Link from "next/link";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconArrowUpRight,
  IconCalendarEvent,
  IconChecklist,
  IconFlame,
  IconPlus,
  IconTarget,
  IconUsers,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { hasModule, type ProjectModuleKey } from "@/lib/projects/modules";
import { ProspectingCadence } from "@/components/crm/ProspectingCadence";
import { PipelineFunnel } from "@/components/crm/PipelineFunnel";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { formatChf, type ActivityPoint, type PipelineStageCount } from "@/lib/crm/dashboard";

export type TodayItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
  tone?: "overdue" | "today" | "neutral";
};

export type FollowUpItem = {
  id: string;
  href: string;
  name: string;
  status: string;
  when: string;
};

export type RecentItem = {
  id: string;
  href: string;
  title: string;
  when: string;
};

export type AgendaItem = {
  id: string;
  href: string;
  title: string;
  day: string;
  time: string | null;
  kind: "event" | "demo" | "follow_up";
};

export type TodoItem = {
  id: string;
  href: string;
  title: string;
  due: string;
  priority: string;
  overdue: boolean;
};

export type SpotlightItem = {
  id: string;
  href: string;
  name: string;
  status: string;
  detail: string;
  value: number | null;
};

const TONE_TEXT: Record<string, string> = {
  overdue: "text-rose-300",
  today: "text-amber-300",
  neutral: "text-wo-dim",
};

const AGENDA_ICON = {
  event: IconCalendarEvent,
  demo: IconTarget,
  follow_up: IconArrowUpRight,
} as const;

export function ProjectDashboard({
  projectId,
  projectName,
  enabledModules,
  kpis,
  stages,
  series7,
  series30,
  series90,
  todayItems,
  followUps,
  recent,
  agenda,
  todos,
  spotlight,
}: {
  projectId: string;
  projectName: string;
  enabledModules?: ProjectModuleKey[];
  kpis: {
    prospects: number;
    toContact: number;
    followUps: number;
    meetings: number;
    clients: number;
    potentialValue: number;
    overdue: number;
  };
  stages: PipelineStageCount[];
  series7: ActivityPoint[];
  series30: ActivityPoint[];
  series90: ActivityPoint[];
  todayItems: TodayItem[];
  followUps: FollowUpItem[];
  recent: RecentItem[];
  agenda: AgendaItem[];
  todos: TodoItem[];
  spotlight: SpotlightItem[];
}) {
  const base = `/projects/${projectId}`;
  const prospecting = hasModule(enabledModules, "prospects");

  const kpiCards = [
    {
      label: "Prospects",
      value: kpis.prospects,
      href: `${base}/prospects`,
      icon: IconUsers,
      hint: `${kpis.clients} clients`,
    },
    {
      label: "À contacter",
      value: kpis.toContact,
      href: `${base}/prospects?status=${encodeURIComponent("À contacter")}`,
      icon: IconTarget,
      hint: "jamais approchés",
    },
    {
      label: "Relances",
      value: kpis.followUps,
      href: `${base}/pipeline`,
      icon: IconArrowUpRight,
      hint: kpis.overdue > 0 ? `${kpis.overdue} en retard` : "à jour",
      alert: kpis.overdue > 0,
    },
    {
      label: "Rendez-vous",
      value: kpis.meetings,
      href: `${base}/prospects?status=${encodeURIComponent("Démo")}`,
      icon: IconCalendarEvent,
      hint: "démos planifiées",
    },
  ];

  if (!prospecting) {
    return (
      <section className="wo-card p-8 text-center">
        <p className="text-sm text-wo-muted">
          Activez le module Prospects dans les paramètres du projet pour suivre la prospection ici.
        </p>
        <Link href={`${base}/settings`} className={`${ui.btnSecondary} mt-4`}>
          Ouvrir les paramètres
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4 crm-animate-in">
      {/* Hero */}
      <section className="wo-hero grid gap-6 p-6 sm:p-7 lg:grid-cols-[1.35fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-wo-accent/25 bg-wo-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f3a35c]">
            <span className="h-1.5 w-1.5 rounded-full bg-wo-accent shadow-[0_0_8px_rgba(217,119,50,0.9)]" />
            {projectName}
          </span>
          <h2 className="mt-4 max-w-lg font-display text-[1.9rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-[2.35rem]">
            {kpis.toContact > 0
              ? `${kpis.toContact} prospects attendent un premier contact.`
              : kpis.followUps > 0
                ? `${kpis.followUps} relances à faire avancer.`
                : "Votre pipeline est à jour."}
          </h2>
          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-wo-muted">
            {kpis.prospects} prospects suivis
            {kpis.potentialValue > 0 ? ` · ${formatChf(kpis.potentialValue)} de potentiel` : ""}
            {kpis.overdue > 0 ? ` · ${kpis.overdue} échéances dépassées` : ""}.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`${base}/prospects`} className={ui.btnPrimary}>
              <IconPlus className="h-4 w-4" />
              Ajouter un prospect
            </Link>
            <Link href={`${base}/pipeline`} className={ui.btnSecondary}>
              Voir le pipeline
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Clients signés", value: String(kpis.clients) },
            {
              label: "Potentiel",
              value: kpis.potentialValue > 0 ? formatChf(kpis.potentialValue) : "—",
            },
            { label: "Rendez-vous", value: String(kpis.meetings) },
            { label: "En retard", value: String(kpis.overdue) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm"
            >
              <p className="text-[11px] text-wo-dim">{item.label}</p>
              <p className="mt-1.5 font-display text-[1.35rem] font-semibold tabular-nums tracking-tight text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="wo-stat group">
              <div className="flex items-start justify-between gap-2">
                <span className="wo-tile">
                  <Icon className="h-[18px] w-[18px]" stroke={1.7} />
                </span>
                <IconArrowRight className="h-4 w-4 text-wo-dim opacity-0 transition group-hover:opacity-100" />
              </div>
              <p className="mt-4 text-[12.5px] text-wo-muted">{card.label}</p>
              <p className="mt-0.5 font-display text-[2rem] font-semibold tabular-nums leading-tight tracking-tight text-wo-text">
                {card.value}
              </p>
              <p className={`mt-1 text-[11.5px] ${card.alert ? "text-rose-300" : "text-wo-dim"}`}>{card.hint}</p>
            </Link>
          );
        })}
      </div>

      {/* Cadence + Pipeline */}
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ProspectingCadence series7={series7} series30={series30} series90={series90} />
        </div>
        <div className="xl:col-span-2">
          <PipelineFunnel stages={stages} projectId={projectId} />
        </div>
      </div>

      {/* Aujourd'hui · Agenda · To-do */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Aujourd'hui"
          action={{ label: "Prospects", href: `${base}/prospects` }}
          empty={todayItems.length === 0 ? "Rien d'urgent aujourd'hui." : null}
        >
          <ul className="space-y-0.5">
            {todayItems.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="wo-row">
                  <span
                    className={`wo-tile ${
                      item.tone === "overdue"
                        ? "!border-rose-400/25 !bg-rose-400/10 !text-rose-300"
                        : item.tone === "today"
                          ? "!border-amber-400/25 !bg-amber-400/10 !text-amber-300"
                          : ""
                    }`}
                  >
                    {item.tone === "overdue" ? (
                      <IconAlertTriangle className="h-4 w-4" stroke={1.8} />
                    ) : (
                      <IconTarget className="h-4 w-4" stroke={1.8} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-wo-text">{item.title}</span>
                    <span className={`block text-[11.5px] ${TONE_TEXT[item.tone ?? "neutral"]}`}>{item.meta}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Agenda"
          action={
            hasModule(enabledModules, "calendar")
              ? { label: "Calendrier", href: `${base}/calendar` }
              : undefined
          }
          empty={agenda.length === 0 ? "Aucune échéance à venir." : null}
        >
          <ul className="space-y-0.5">
            {agenda.map((item) => {
              const Icon = AGENDA_ICON[item.kind];
              return (
                <li key={item.id}>
                  <Link href={item.href} className="wo-row">
                    <span className="wo-tile !h-9 !w-9 flex-col !gap-0 !rounded-xl">
                      <Icon className="h-4 w-4 text-wo-accent" stroke={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-wo-text">{item.title}</span>
                      <span className="block text-[11.5px] text-wo-dim">
                        {item.day}
                        {item.time ? ` · ${item.time}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card
          title="To-do list"
          action={
            hasModule(enabledModules, "tasks") ? { label: "Tout voir", href: `${base}/tasks` } : undefined
          }
          empty={todos.length === 0 ? "Aucune tâche en cours." : null}
        >
          <ul className="space-y-0.5">
            {todos.map((task) => (
              <li key={task.id}>
                <Link href={task.href} className="wo-row">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      task.overdue ? "border-rose-400/60" : "border-white/25"
                    }`}
                  >
                    <IconChecklist className="h-2.5 w-2.5 text-transparent" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-wo-text">{task.title}</span>
                    <span className={`block text-[11.5px] ${task.overdue ? "text-rose-300" : "text-wo-dim"}`}>
                      {task.due}
                      {task.priority && task.priority !== "Normale" ? ` · ${task.priority}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Relances · Spotlight · Activité */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Prochaines relances"
          action={{ label: "Pipeline", href: `${base}/pipeline` }}
          empty={followUps.length === 0 ? "Aucune relance programmée." : null}
        >
          <ul className="space-y-0.5">
            {followUps.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="wo-row">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-wo-text">{item.name}</span>
                    <span className="mt-1.5 block">
                      <StatusBadge status={item.status} />
                    </span>
                  </span>
                  <span className="shrink-0 text-[11.5px] text-wo-muted">{item.when}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Prospects à suivre"
          icon={<IconFlame className="h-4 w-4 text-amber-300" stroke={1.8} />}
          action={{ label: "Tous", href: `${base}/prospects` }}
          empty={spotlight.length === 0 ? "Aucun prospect chaud pour le moment." : null}
        >
          <ul className="space-y-0.5">
            {spotlight.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="wo-row">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-wo-text">{item.name}</span>
                    <span className="block truncate text-[11.5px] text-wo-dim">{item.detail}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <StatusBadge status={item.status} />
                    {item.value ? (
                      <span className="mt-1 block text-[11px] tabular-nums text-wo-muted">
                        {formatChf(item.value)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Activité récente"
          action={
            hasModule(enabledModules, "activity")
              ? { label: "Historique", href: `${base}/activity` }
              : undefined
          }
          empty={recent.length === 0 ? "Les actions apparaîtront ici." : null}
        >
          <ol className="relative space-y-0.5 pl-3">
            <span className="absolute bottom-3 left-[5px] top-3 w-px bg-white/[0.07]" aria-hidden />
            {recent.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-3 top-[15px] h-[7px] w-[7px] rounded-full border border-wo-accent/50 bg-[#15110e]" />
                <Link href={item.href} className="wo-row !py-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-wo-secondary">{item.title}</span>
                  <span className="shrink-0 text-[11px] text-wo-dim">{item.when}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  action,
  empty,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: { label: string; href: string };
  empty?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="wo-widget p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-wo-text">
          {icon}
          {title}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-wo-muted transition hover:text-wo-text"
          >
            {action.label}
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {empty ? <p className="py-8 text-center text-[13px] text-wo-dim">{empty}</p> : children}
    </section>
  );
}
