"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowRight, IconPlus } from "@tabler/icons-react";
import { RavenLogo } from "@/components/brand/Logo";
import { ui } from "@/lib/design/tokens";
import type { ProjectSummary } from "@/lib/projects/types";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ProjectAvatar } from "@/components/projects/ProjectAvatar";
import { ACTIVE_PROJECT_STORAGE_KEY, writeStoredId } from "@/lib/app/workspace";

export function ProjectsPicker({
  projects,
  unassignedCount = 0,
}: {
  projects: ProjectSummary[];
  unassignedCount?: number;
}) {
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const active = projects.filter((p) => p.status === "active" && p.id !== "unassigned");

  const openProject = (id: string) => {
    writeStoredId(ACTIVE_PROJECT_STORAGE_KEY, id);
    router.push(`/projects/${id}`);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <RavenLogo size="md" variant="lockup" />
          <h1 className="mt-7 font-display text-[2.15rem] font-semibold tracking-tight text-wo-text sm:text-[2.5rem]">
            Vos projets
          </h1>
          <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-wo-muted">
            Choisissez l’espace dans lequel vous souhaitez travailler.
          </p>
        </div>
        <button type="button" className={ui.btnPrimary} onClick={() => setCreate(true)}>
          <IconPlus className="h-4 w-4" />
          Créer un projet
        </button>
      </header>

      {active.length === 0 ? (
        <section className="wo-hero px-8 py-14 text-center">
          <p className="wo-kicker">Bienvenue</p>
          <h2 className="mt-3 font-display text-[1.85rem] font-semibold tracking-tight text-white">
            Bienvenue sur Raven
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-wo-muted">
            Créez votre premier espace de prospection.
          </p>
          <button type="button" className={`${ui.btnPrimary} mt-7`} onClick={() => setCreate(true)}>
            <IconPlus className="h-4 w-4" />
            Créer mon premier projet
          </button>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => openProject(project.id)}
              className="wo-picker-card text-left"
            >
              <ProjectAvatar project={project} size="xl" />
              <div className="mt-8">
                <h2 className="font-display text-[1.55rem] font-semibold tracking-tight text-white">
                  {project.name}
                </h2>
                <p className="mt-3 text-[14px] text-wo-secondary">
                  {project.prospectsCount} prospect{project.prospectsCount > 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-[14px] text-wo-muted">
                  {project.toContactCount} à contacter
                </p>
              </div>
              <span className="mt-auto flex items-center justify-between pt-8 text-[13.5px] font-medium text-wo-accent">
                Ouvrir le projet
                <IconArrowRight className="h-4 w-4" stroke={1.8} />
              </span>
            </button>
          ))}

          <button type="button" onClick={() => setCreate(true)} className="wo-picker-card wo-picker-create text-left">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-wo-muted">
              <IconPlus className="h-7 w-7" stroke={1.6} />
            </span>
            <div className="mt-8">
              <h2 className="font-display text-[1.55rem] font-semibold tracking-tight text-white">
                Créer un projet
              </h2>
              <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-wo-muted">
                Un nouvel espace pour une autre activité, une autre marque.
              </p>
            </div>
            <span className="mt-auto pt-8 text-[13.5px] font-medium text-wo-dim">Nouveau projet</span>
          </button>
        </div>
      )}

      {unassignedCount > 0 ? (
        <Link
          href="/projects/unassigned"
          className="mt-5 block rounded-2xl border border-wo-border bg-white/[0.02] px-5 py-4 text-sm text-wo-muted transition hover:border-white/15 hover:text-wo-text"
        >
          {unassignedCount} prospect{unassignedCount > 1 ? "s" : ""} sans projet
        </Link>
      ) : null}

      {create ? (
        <ProjectFormModal
          onClose={() => setCreate(false)}
          onSaved={(project) => {
            setCreate(false);
            writeStoredId(ACTIVE_PROJECT_STORAGE_KEY, project.id);
            router.push(`/projects/${project.id}`);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
