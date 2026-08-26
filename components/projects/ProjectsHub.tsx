"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import type { LauncherProjectCard } from "@/lib/home/launcher";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ConfirmModal, EmptyState } from "@/components/ui/ConfirmModal";
import { DeleteProjectModal } from "@/components/projects/DeleteProjectModal";
import { ProjectAvatar } from "@/components/projects/ProjectAvatar";
import { can } from "@/lib/access/permissions";
import type { Project } from "@/lib/projects/types";

export function ProjectsHub({
  projects,
  archived,
  unassigned,
}: {
  projects: LauncherProjectCard[];
  archived: Project[];
  unassigned: { prospects: number; tasks: number; notes: number };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("filter") === "archived" ? "archived" : "active";
  const [filter, setFilter] = useState<"active" | "archived">(initial);
  const [create, setCreate] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const list = useMemo(
    () => (filter === "archived" ? archived : projects),
    [filter, archived, projects]
  );

  const restore = async (project: Project) => {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.h1}>Projets</h1>
          <p className="mt-1 text-sm text-wo-muted">Choisissez un espace collaboratif, puis travaillez dedans.</p>
        </div>
        <button type="button" className={ui.btnPrimary} onClick={() => setCreate(true)}>
          <IconPlus className="h-4 w-4" />
          Nouveau projet
        </button>
      </div>

      <div className={ui.subNav}>
        {(["active", "archived"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`inline-flex shrink-0 items-center rounded-full px-3.5 py-2 text-sm font-medium ${
              filter === id ? ui.subNavActive : ui.subNavIdle
            }`}
          >
            {id === "active" ? "Actifs" : "Archivés"}
          </button>
        ))}
      </div>

      {unassigned.prospects + unassigned.tasks + unassigned.notes > 0 && filter === "active" ? (
        <Link href="/projects/unassigned" className={`${ui.cardInteractive} block p-4`}>
          <p className="text-sm font-semibold text-wo-text">Sans projet</p>
          <p className="mt-1 text-sm text-wo-muted">
            {unassigned.prospects} prospect{unassigned.prospects > 1 ? "s" : ""} · {unassigned.tasks} tâche
            {unassigned.tasks > 1 ? "s" : ""} · {unassigned.notes} note{unassigned.notes > 1 ? "s" : ""}
          </p>
        </Link>
      ) : null}

      {list.length === 0 ? (
        <EmptyState
          title={filter === "archived" ? "Aucun projet archivé" : "Vous n'avez encore aucun projet"}
          description={
            filter === "active"
              ? "Votre espace Personnel suffit. Créez un projet quand vous voulez collaborer."
              : undefined
          }
          action={
            filter === "active" ? (
              <button type="button" className={ui.btnPrimary} onClick={() => setCreate(true)}>
                <IconPlus className="h-4 w-4" />
                Créer un projet
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const card = p as LauncherProjectCard;
            const next =
              "nextEventAt" in card && card.nextEventAt
                ? format(new Date(card.nextEventAt), "d MMM HH:mm", { locale: fr })
                : null;
            const isOwner = can(p.myRole, "project.delete") || p.myRole === "owner";
            const canArchive = can(p.myRole, "project.archive");
            return (
              <div key={p.id} className={`${ui.cardInteractive} p-5`}>
                <Link href={`/projects/${p.id}`} className="block">
                  <div className="flex items-center gap-3">
                    <ProjectAvatar project={p} size="md" />
                    <div>
                      <h2 className="text-base font-semibold text-wo-text">{p.name}</h2>
                      <p className="text-xs text-wo-muted">{p.status === "active" ? "Actif" : "Archivé"}</p>
                    </div>
                  </div>
                  {"openTasks" in card ? (
                    <div className="mt-4 space-y-1 text-sm text-wo-muted">
                      <p>
                        {card.openTasks} tâche{card.openTasks > 1 ? "s" : ""}
                      </p>
                      {card.followUps > 0 ? <p>{card.followUps} à relancer</p> : null}
                      {next ? (
                        <p>
                          Prochain : {card.nextEventTitle} · {next}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
                {isOwner || canArchive ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {can(p.myRole, "project.edit_settings") ? (
                      <button type="button" className={ui.btnGhost} onClick={() => setEditing(p)}>
                        Modifier
                      </button>
                    ) : null}
                    {canArchive && p.status === "active" ? (
                      <button type="button" className={ui.btnGhost} onClick={() => setArchiveTarget(p)}>
                        Archiver
                      </button>
                    ) : null}
                    {canArchive && p.status === "archived" ? (
                      <button type="button" className={ui.btnGhost} onClick={() => void restore(p)}>
                        Restaurer
                      </button>
                    ) : null}
                    {isOwner ? (
                      <button type="button" className={ui.btnGhost} onClick={() => setDeleteTarget(p)}>
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

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
      {editing ? (
        <ProjectFormModal
          project={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
      <ConfirmModal
        open={Boolean(archiveTarget)}
        title={archiveTarget ? `Archiver ${archiveTarget.name} ?` : "Archiver ce projet ?"}
        description="Le projet disparaîtra de la liste principale. Les données et les membres sont conservés."
        confirmLabel="Archiver"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await fetch(`/api/projects/${archiveTarget.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "archived" }),
          });
          setArchiveTarget(null);
          router.refresh();
        }}
      />
      {deleteTarget ? (
        <DeleteProjectModal
          projectName={deleteTarget.name}
          loading={deleting}
          error={deleteError}
          onCancel={() => {
            if (deleting) return;
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={async (confirmName) => {
            if (!deleteTarget) return;
            setDeleting(true);
            setDeleteError(null);
            const res = await fetch(`/api/projects/${deleteTarget.id}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirm_name: confirmName }),
            });
            const data = await res.json().catch(() => ({}));
            setDeleting(false);
            if (!res.ok) {
              setDeleteError(data.error ?? "Suppression impossible");
              return;
            }
            setDeleteTarget(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
