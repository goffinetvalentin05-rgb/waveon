"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconLock, IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import type { LauncherData } from "@/lib/home/launcher";

function formatWhen(iso: string | null) {
  if (!iso) return null;
  try {
    return format(new Date(iso), "EEE d MMM · HH:mm", { locale: fr });
  } catch {
    return null;
  }
}

export function SpaceLauncher({
  firstName,
  data,
}: {
  firstName: string;
  data: LauncherData;
}) {
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const nextPersonal = formatWhen(data.personal.nextEventAt);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="crm-animate-in">
        <p className={ui.kicker}>Cockpit</p>
        <h1 className="mt-2 font-display text-[2rem] font-semibold tracking-tight text-wo-text sm:text-[2.4rem]">
          Bonjour {firstName}.
        </h1>
        <p className="mt-2 text-base text-wo-muted">Sur quoi voulez-vous travailler ?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 crm-animate-in-delay-1">
        <Link href="/personal" className="wo-card-featured group flex min-h-[200px] flex-col justify-between p-6">
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className={ui.kicker}>Espace</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-white">Personnel</h2>
            </div>
            {data.personal.lockEnabled ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[11px] text-wo-secondary">
                <IconLock className="h-3.5 w-3.5" />
                {data.personal.unlocked ? "Session ouverte" : "Verrouillé"}
              </span>
            ) : null}
          </div>
          <div className="relative space-y-1.5 text-sm text-white/70">
            <p>
              {data.personal.openTasks} tâche{data.personal.openTasks > 1 ? "s" : ""} personnelle
              {data.personal.openTasks > 1 ? "s" : ""}
            </p>
            <p className="text-white/45">
              {nextPersonal ? `Prochain : ${data.personal.nextEventTitle} · ${nextPersonal}` : "Aucun événement à venir"}
            </p>
          </div>
        </Link>

        {data.projects.map((project) => {
          const when = formatWhen(project.nextEventAt);
          return (
            <Link key={project.id} href={`/projects/${project.id}`} className={`${ui.cardInteractive} group relative flex min-h-[200px] flex-col justify-between overflow-hidden p-6`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg"
                    style={{ background: `${project.color ?? "#3dff8a"}22` }}
                  >
                    {project.icon || project.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-wo-dim">
                      {project.status === "active" ? "Projet actif" : "Archivé"}
                    </p>
                    <h2 className="font-display text-xl font-semibold text-wo-text">{project.name}</h2>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-wo-muted">
                <p>
                  {project.openTasks} tâche{project.openTasks > 1 ? "s" : ""}
                </p>
                {project.followUps > 0 ? (
                  <p>
                    {project.followUps} prospect{project.followUps > 1 ? "s" : ""} à relancer
                  </p>
                ) : null}
                {when ? <p>Prochain : {project.nextEventTitle} · {when}</p> : null}
              </div>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setCreate(true)}
          className="wo-card-cta flex min-h-[200px] flex-col items-start justify-between p-6 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10">
            <IconPlus className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Nouveau projet</span>
        </button>
      </div>

      {data.unassigned.prospects + data.unassigned.tasks + data.unassigned.notes > 0 ? (
        <Link href="/projects?filter=unassigned" className={`${ui.cardInteractive} block p-4 text-sm text-wo-muted`}>
          <span className="font-medium text-wo-secondary">Sans projet</span>
          {" · "}
          {data.unassigned.prospects} prospect{data.unassigned.prospects > 1 ? "s" : ""}
          {data.unassigned.tasks ? ` · ${data.unassigned.tasks} tâches` : ""}
          {data.unassigned.notes ? ` · ${data.unassigned.notes} notes` : ""}
        </Link>
      ) : null}

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
