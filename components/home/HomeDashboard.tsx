"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconChecklist,
  IconClockHour4,
  IconNote,
  IconPlus,
  IconUsers,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import type { CommandCenterData } from "@/lib/home/command-center";

function when(iso: string) {
  try {
    return format(new Date(iso), "HH:mm", { locale: fr });
  } catch {
    return "";
  }
}

function dayLabel(iso: string) {
  try {
    return format(new Date(`${iso.slice(0, 10)}T12:00:00`), "d MMM", { locale: fr });
  } catch {
    return iso;
  }
}

export function HomeDashboard({
  firstName,
  data,
}: {
  firstName: string;
  data: CommandCenterData;
}) {
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const activeCount = data.projects.length;
  const overdue = data.overdueTasks.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2 crm-animate-in">
        <Link href="/personal/tasks" className={ui.btnSecondary}>
          <IconChecklist className="h-4 w-4" stroke={1.6} />
          Mes tâches
        </Link>
        <button type="button" className={ui.btnPrimary} onClick={() => setCreate(true)}>
          <IconPlus className="h-4 w-4" stroke={1.8} />
          Nouveau projet
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 crm-animate-in-delay-1">
        <section className="wo-card-featured flex min-h-[220px] flex-col justify-between p-6 lg:col-span-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Workspace</p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {activeCount}
            </p>
            <p className="mt-1 text-sm text-white/80">
              projet{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
            </p>
            <span className="mt-3 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
              Bonjour {firstName}
            </span>
          </div>
          <Link href="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white">
            Voir les projets
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:col-span-7">
          {[
            {
              label: "Tâches aujourd'hui",
              value: data.todayTasks.length,
              icon: IconChecklist,
              href: "/personal/tasks",
              tone: "bg-indigo-50 text-indigo-600",
            },
            {
              label: "En retard",
              value: overdue,
              icon: IconClockHour4,
              href: "/personal/tasks",
              tone: "bg-rose-50 text-rose-600",
            },
            {
              label: "Relances",
              value: data.followUpsDue,
              icon: IconUsers,
              href: "/projects",
              tone: "bg-sky-50 text-sky-600",
            },
            {
              label: "Événements",
              value: data.todayEvents.length,
              icon: IconCalendarEvent,
              href: "/personal/calendar",
              tone: "bg-emerald-50 text-emerald-600",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.label} href={card.href} className={ui.statCard}>
                <div className="flex items-start justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                    <Icon className="h-4 w-4" stroke={1.7} />
                  </span>
                </div>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-wo-dim">{card.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight text-wo-text">
                  {card.value}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 crm-animate-in-delay-2">
        <section className={`${ui.widget} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={ui.h2}>Tâches du jour</h2>
            <Link href="/personal/tasks" className="text-sm font-medium text-wo-accent hover:text-wo-accent">
              Tout voir
            </Link>
          </div>
          {data.todayTasks.length === 0 ? (
            <p className="mt-4 text-sm text-wo-muted">Rien de prévu aujourd&apos;hui.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.todayTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 rounded-xl px-1 py-1.5">
                  <span className="truncate text-sm text-wo-text">{task.title}</span>
                  <span className="shrink-0 text-[11px] text-wo-dim">
                    {task.scope === "personal" ? "Personnel" : task.projectName ?? "Projet"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {data.overdueTasks.length > 0 ? (
            <div className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {data.overdueTasks.length} tâche{data.overdueTasks.length > 1 ? "s" : ""} en retard
            </div>
          ) : null}
        </section>

        <section className={`${ui.widget} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={ui.h2}>Prochains événements</h2>
            <Link href="/personal/calendar" className="text-sm font-medium text-wo-accent">
              Calendrier
            </Link>
          </div>
          {data.todayEvents.length === 0 ? (
            <p className="mt-4 text-sm text-wo-muted">Aucun événement aujourd&apos;hui.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.todayEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-wo-text">{event.title}</span>
                  <span className="shrink-0 tabular-nums text-wo-dim">{when(event.start_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 crm-animate-in-delay-3">
        <section className={`${ui.widget} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={ui.h2}>Projets actifs</h2>
            <button type="button" onClick={() => setCreate(true)} className="text-sm font-medium text-wo-accent">
              Nouveau
            </button>
          </div>
          {data.projects.length === 0 ? (
            <p className="mt-4 text-sm text-wo-muted">Créez un premier projet pour collaborer.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition hover:bg-wo-hover"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm"
                        style={{ background: `${project.color ?? "#6366F1"}18`, color: project.color ?? "#6366F1" }}
                      >
                        {project.icon || project.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-wo-text">{project.name}</span>
                        <span className="block text-[11px] text-wo-dim">
                          {project.openTasks} tâche{project.openTasks > 1 ? "s" : ""}
                          {project.followUps ? ` · ${project.followUps} relance${project.followUps > 1 ? "s" : ""}` : ""}
                        </span>
                      </span>
                    </span>
                    <IconArrowRight className="h-4 w-4 shrink-0 text-wo-dim" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${ui.widget} p-5`}>
          <h2 className={ui.h2}>Activité récente</h2>
          {data.recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-wo-muted">Aucune activité pour le moment.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.recentActivity.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-wo-text">{item.title}</span>
                  <span className="shrink-0 text-[11px] text-wo-dim">{dayLabel(item.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/personal/calendar", label: "Calendrier", icon: IconCalendarEvent },
          { href: "/personal/tasks", label: "Tâches perso", icon: IconChecklist },
          { href: "/personal/notes", label: "Notes", icon: IconNote },
          { href: "/projects", label: "Tous les projets", icon: IconUsers },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`${ui.cardInteractive} flex items-center gap-3 p-4`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-4 w-4" stroke={1.7} />
              </span>
              <span className="text-sm font-medium text-wo-text">{item.label}</span>
            </Link>
          );
        })}
      </section>

      {create ? (
        <ProjectFormModal
          onClose={() => setCreate(false)}
          onSaved={(project) => {
            setCreate(false);
            router.push(`/projects/${project.id}`);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
