"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconBuilding,
  IconChecklist,
  IconPlus,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { hasModule, type ProjectModuleKey } from "@/lib/projects/modules";

type PipelineStat = { label: string; value: number; href: string };

export function ProjectDashboard({
  projectId,
  projectName,
  enabledModules,
  stats,
  tasks,
  calendarEvents,
  notes,
  activity,
  membersCount,
}: {
  projectId: string;
  projectName: string;
  enabledModules?: ProjectModuleKey[];
  stats: {
    prospects: number;
    contacted: number;
    replies: number;
    meetings: number;
    followUps: number;
    toContact: number;
    overdue: number;
    demos: number;
    considering: number;
    clients: number;
    openTasks: number;
    monthSpend: number;
    monthlySubs: number;
  };
  tasks: { id: string; title: string; due_date: string; status: string; priority: string }[];
  calendarEvents: { id: string; title: string; start_at: string }[];
  notes: { id: string; title: string; updated_at: string }[];
  activity: { id: string; title: string; created_at: string }[];
  membersCount: number;
}) {
  const base = `/projects/${projectId}`;
  const pipeline: PipelineStat[] = hasModule(enabledModules, "prospects")
    ? [
        { label: "À contacter", value: stats.toContact, href: `${base}/prospects?view=to_contact` },
        { label: "Relances", value: stats.followUps, href: `${base}/prospects?view=today_work` },
        { label: "En retard", value: stats.overdue, href: `${base}/prospects?view=overdue` },
        { label: "Rendez-vous", value: stats.meetings || stats.demos, href: `${base}/prospects?view=demo_scheduled` },
        { label: "Réponses", value: stats.replies || stats.considering, href: `${base}/prospects?view=considering` },
        { label: "Clients", value: stats.clients, href: `${base}/prospects?view=clients` },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {hasModule(enabledModules, "prospects") ? (
          <Link href={`${base}/prospects`} className={ui.btnSecondary}>
            <IconUsers className="h-4 w-4" />
            Ajouter un prospect
          </Link>
        ) : null}
        {hasModule(enabledModules, "companies") ? (
          <Link href={`${base}/companies`} className={ui.btnSecondary}>
            <IconBuilding className="h-4 w-4" />
            Ajouter une entreprise
          </Link>
        ) : null}
        {hasModule(enabledModules, "tasks") ? (
          <Link href={`${base}/tasks`} className={ui.btnSecondary}>
            <IconChecklist className="h-4 w-4" />
            Ajouter une tâche
          </Link>
        ) : null}
        {hasModule(enabledModules, "content") ? (
          <Link href={`${base}/content`} className={ui.btnPrimary}>
            <IconSparkles className="h-4 w-4" />
            Ajouter une idée
          </Link>
        ) : (
          <Link href={`${base}/members`} className={ui.btnPrimary}>
            <IconPlus className="h-4 w-4" />
            Inviter un membre
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="wo-card-featured flex min-h-[210px] flex-col justify-between p-6 lg:col-span-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Pipeline</p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {stats.prospects}
            </p>
            <p className="mt-1 text-sm text-white/80">prospects dans {projectName}</p>
            <span className="mt-3 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
              {stats.followUps} relance{stats.followUps > 1 ? "s" : ""} à faire
            </span>
          </div>
          <Link href={`${base}/prospects`} className="inline-flex items-center gap-1 text-sm font-medium text-white/90">
            Voir les prospects →
          </Link>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:col-span-7">
          {[
            { label: "Contactés", value: stats.contacted, tone: "bg-indigo-50 text-indigo-600", icon: IconUsers },
            { label: "Réponses reçues", value: stats.replies || stats.considering, tone: "bg-sky-50 text-sky-600", icon: IconUsers },
            { label: "Rendez-vous", value: stats.meetings || stats.demos, tone: "bg-emerald-50 text-emerald-600", icon: IconUsers },
            { label: "Tâches restantes", value: stats.openTasks, tone: "bg-amber-50 text-amber-600", icon: IconChecklist },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={ui.statCard}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                  <Icon className="h-4 w-4" stroke={1.7} />
                </span>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-wo-dim">{card.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-wo-text">{card.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {pipeline.length ? (
        <section className={`${ui.widget} p-5`}>
          <h2 className={ui.h2}>Progression du pipeline</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {pipeline.map((item) => (
              <Link key={item.label} href={item.href} className="rounded-2xl border border-wo-border bg-slate-50/70 px-3 py-3 transition hover:bg-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-wo-dim">{item.label}</p>
                <p className="mt-1.5 text-xl font-semibold tabular-nums text-wo-text">{item.value}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {hasModule(enabledModules, "tasks") ? (
          <section className={`${ui.widget} p-5`}>
            <div className="flex items-center justify-between">
              <h2 className={ui.h2}>Tâches</h2>
              <Link href={`${base}/tasks`} className="text-sm font-medium text-wo-accent">
                Toutes les tâches
              </Link>
            </div>
            {tasks.length === 0 ? (
              <p className="mt-4 text-sm text-wo-muted">Aucune tâche ouverte.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-wo-text">{t.title}</span>
                    <span className="shrink-0 text-xs text-wo-dim">
                      {format(new Date(`${t.due_date}T12:00:00`), "d MMM", { locale: fr })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className={`${ui.widget} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className={ui.h2}>Activité récente</h2>
            <Link href={`${base}/activity`} className="text-sm font-medium text-wo-accent">
              Historique
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-wo-muted">Les actions du projet apparaîtront ici.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="text-wo-text">{item.title}</p>
                  <p className="text-[11px] text-wo-dim">
                    {format(new Date(item.created_at), "d MMM · HH:mm", { locale: fr })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {hasModule(enabledModules, "calendar") ? (
          <section className={`${ui.widget} p-5`}>
            <h2 className={ui.h2}>Prochains rendez-vous</h2>
            {calendarEvents.length === 0 ? (
              <p className="mt-4 text-sm text-wo-muted">Rien de prévu.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {calendarEvents.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="text-wo-text">{e.title}</p>
                    <p className="text-[11px] text-wo-dim">
                      {format(new Date(e.start_at), "d MMM HH:mm", { locale: fr })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className={`${ui.widget} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className={ui.h2}>Équipe</h2>
            <Link href={`${base}/members`} className="text-sm font-medium text-wo-accent">
              Membres
            </Link>
          </div>
          <p className="mt-4 text-sm text-wo-secondary">
            {membersCount} membre{membersCount > 1 ? "s" : ""} actif{membersCount > 1 ? "s" : ""}
          </p>
          {notes.length > 0 && hasModule(enabledModules, "notes") ? (
            <ul className="mt-4 space-y-2 border-t border-wo-border pt-4">
              {notes.slice(0, 3).map((n) => (
                <li key={n.id} className="truncate text-sm text-wo-text">
                  {n.title || "Sans titre"}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  );
}
