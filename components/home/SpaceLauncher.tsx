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
      <div>
        <h1 className="text-[2rem] font-semibold tracking-tight text-[#f3f0fa] sm:text-[2.35rem]">
          Bonjour {firstName}.
        </h1>
        <p className="mt-2 text-base text-[#8b869c]">Sur quoi voulez-vous travailler ?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/personal"
          className="group relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#14121c] p-6 transition hover:border-violet-500/35 hover:bg-[#1a1824]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6a6578]">Espace</p>
              <h2 className="mt-1 text-xl font-semibold text-[#f3f0fa]">Personnel</h2>
            </div>
            {data.personal.lockEnabled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-[11px] text-[#c8c3d6]">
                <IconLock className="h-3.5 w-3.5" />
                {data.personal.unlocked ? "Session ouverte" : "Verrouillé"}
              </span>
            ) : null}
          </div>
          <div className="mt-6 space-y-1.5 text-sm text-[#8b869c]">
            <p>
              {data.personal.openTasks} tâche{data.personal.openTasks > 1 ? "s" : ""} personnelle
              {data.personal.openTasks > 1 ? "s" : ""}
            </p>
            <p>{nextPersonal ? `Prochain : ${data.personal.nextEventTitle} · ${nextPersonal}` : "Aucun événement à venir"}</p>
          </div>
        </Link>

        {data.projects.map((project) => {
          const when = formatWhen(project.nextEventAt);
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#14121c] p-6 transition hover:border-white/[0.14] hover:bg-[#1a1824]"
            >
              <span
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ background: project.color ?? "#8b5cf6" }}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-[12px] text-lg"
                    style={{ background: `${project.color ?? "#8b5cf6"}22` }}
                  >
                    {project.icon || project.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6a6578]">
                      {project.status === "active" ? "Projet actif" : "Archivé"}
                    </p>
                    <h2 className="text-xl font-semibold text-[#f3f0fa]">{project.name}</h2>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-1.5 text-sm text-[#8b869c]">
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
          className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-white/[0.12] text-sm text-[#8b869c] transition hover:border-violet-500/40 hover:text-[#f3f0fa]"
        >
          <IconPlus className="h-5 w-5" />
          Nouveau projet
        </button>
      </div>

      {data.unassigned.prospects + data.unassigned.tasks + data.unassigned.notes > 0 ? (
        <Link href="/projects?filter=unassigned" className={`${ui.cardInteractive} block p-4 text-sm text-[#8b869c]`}>
          <span className="font-medium text-[#c8c3d6]">Sans projet</span>
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
