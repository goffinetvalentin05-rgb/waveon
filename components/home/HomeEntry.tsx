"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconChecklist,
  IconLock,
  IconNote,
  IconPlus,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ProjectAvatar } from "@/components/projects/ProjectAvatar";
import type { Project } from "@/lib/projects/types";

export function HomeEntry({
  firstName,
  projects,
  personalLocked,
}: {
  firstName: string;
  projects: Project[];
  personalLocked: boolean;
}) {
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const active = projects.filter((p) => p.status === "active");

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="crm-animate-in">
        <h1 className="font-display text-[2rem] font-semibold tracking-tight text-wo-text sm:text-[2.35rem]">
          Bonjour {firstName}
        </h1>
        <p className="mt-2 text-base text-wo-muted">Choisissez un espace. Rien n&apos;est mélangé.</p>
      </div>

      <section className="crm-animate-in-delay-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-wo-dim">Personnel</h2>
          {personalLocked ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-wo-muted">
              <IconLock className="h-3.5 w-3.5" />
              Protégé
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { href: "/personal/calendar", label: "Calendrier", icon: IconCalendarEvent },
            { href: "/personal/tasks", label: "Tâches", icon: IconChecklist },
            { href: "/personal/notes", label: "Notes", icon: IconNote },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`${ui.cardInteractive} flex items-center gap-3 p-4`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" stroke={1.7} />
                </span>
                <span className="text-sm font-medium text-wo-text">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="crm-animate-in-delay-2">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-wo-dim">Mes projets</h2>
        {active.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-wo-border bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-wo-text">Vous n&apos;avez encore aucun projet</p>
            <p className="mt-1 text-sm text-wo-dim">
              Votre espace Personnel est déjà là. Créez un projet pour collaborer.
            </p>
            <button type="button" className={`${ui.btnPrimary} mt-4`} onClick={() => setCreate(true)}>
              <IconPlus className="h-4 w-4" />
              Créer un projet
            </button>
          </div>
        ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={`${ui.cardInteractive} flex min-h-[132px] flex-col justify-between p-5`}
            >
              <span className="flex items-center gap-3">
                <ProjectAvatar project={project} size="md" />
                <span>
                  <span className="block font-display text-lg font-semibold text-wo-text">{project.name}</span>
                  {project.description ? (
                    <span className="mt-0.5 line-clamp-1 block text-sm text-wo-muted">{project.description}</span>
                  ) : (
                    <span className="mt-0.5 block text-sm text-wo-muted">Ouvrir le projet</span>
                  )}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-wo-accent">
                Ouvrir
                <IconArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setCreate(true)}
            className="wo-card-cta flex min-h-[132px] flex-col items-start justify-between p-5 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <IconPlus className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-semibold">Créer un projet</span>
          </button>
        </div>
        )}
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
