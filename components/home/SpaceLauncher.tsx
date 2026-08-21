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
        <h1 className="mt-2 font-display text-[2rem] font-semibold tracking-tight text-[#eef6f2] sm:text-[2.4rem]">
          Bonjour {firstName}.
        </h1>
        <p className="mt-2 text-base text-[#8a9e96]">Sur quoi voulez-vous travailler ?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 crm-animate-in-delay-1">
        <Link href="/personal" className="wo-card-featured group p-6">
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className={ui.kicker}>Espace</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-[#eef6f2]">Personnel</h2>
            </div>
            {data.personal.lockEnabled ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-[#c2d4cc]">
                <IconLock className="h-3.5 w-3.5" />
                {data.personal.unlocked ? "Session ouverte" : "Verrouillé"}
              </span>
            ) : null}
          </div>
          <div className="relative mt-8 space-y-1.5 text-sm text-[#a7f3d0]/80">
            <p>
              {data.personal.openTasks} tâche{data.personal.openTasks > 1 ? "s" : ""} personnelle
              {data.personal.openTasks > 1 ? "s" : ""}
            </p>
            <p className="text-[#8a9e96]">
              {nextPersonal ? `Prochain : ${data.personal.nextEventTitle} · ${nextPersonal}` : "Aucun événement à venir"}
            </p>
          </div>
        </Link>

        {data.projects.map((project) => {
          const when = formatWhen(project.nextEventAt);
          return (
            <Link key={project.id} href={`/projects/${project.id}`} className={`${ui.cardInteractive} group relative overflow-hidden p-6`}>
              <span
                className="absolute inset-y-4 left-0 w-[3px] rounded-full"
                style={{ background: project.color ?? "#10b981" }}
              />
              <div className="flex items-start justify-between gap-3 pl-1">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg"
                    style={{ background: `${project.color ?? "#10b981"}22` }}
                  >
                    {project.icon || project.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7d76]">
                      {project.status === "active" ? "Projet actif" : "Archivé"}
                    </p>
                    <h2 className="font-display text-xl font-semibold text-[#eef6f2]">{project.name}</h2>
                  </div>
                </div>
              </div>
              <div className="mt-8 space-y-1.5 text-sm text-[#8a9e96]">
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
          className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-white/[0.12] text-sm text-[#8a9e96] transition hover:border-emerald-400/40 hover:bg-emerald-500/[0.04] hover:text-[#eef6f2]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
            <IconPlus className="h-5 w-5" />
          </span>
          Nouveau projet
        </button>
      </div>

      {data.unassigned.prospects + data.unassigned.tasks + data.unassigned.notes > 0 ? (
        <Link href="/projects?filter=unassigned" className={`${ui.cardInteractive} block p-4 text-sm text-[#8a9e96]`}>
          <span className="font-medium text-[#c2d4cc]">Sans projet</span>
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
