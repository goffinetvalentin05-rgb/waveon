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
  const [confirm, setConfirm] = useState<{ type: "archive" | "delete"; project: Project } | null>(null);

  const list = useMemo(
    () => (filter === "archived" ? archived : projects),
    [filter, archived, projects]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={ui.h1}>Projets</h1>
          <p className="mt-1 text-sm text-[#8b869c]">Choisissez un espace business, puis travaillez dedans.</p>
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
            className={`inline-flex shrink-0 items-center rounded-[10px] px-3.5 py-2 text-sm font-medium ${
              filter === id ? ui.subNavActive : ui.subNavIdle
            }`}
          >
            {id === "active" ? "Actifs" : "Archivés"}
          </button>
        ))}
      </div>

      {unassigned.prospects + unassigned.tasks + unassigned.notes > 0 && filter === "active" ? (
        <Link href="/projects/unassigned" className={`${ui.cardInteractive} block p-4`}>
          <p className="text-sm font-semibold text-[#f3f0fa]">Sans projet</p>
          <p className="mt-1 text-sm text-[#8b869c]">
            {unassigned.prospects} prospect{unassigned.prospects > 1 ? "s" : ""} · {unassigned.tasks} tâche
            {unassigned.tasks > 1 ? "s" : ""} · {unassigned.notes} note{unassigned.notes > 1 ? "s" : ""}
          </p>
        </Link>
      ) : null}

      {list.length === 0 ? (
        <EmptyState
          title={filter === "archived" ? "Aucun projet archivé" : "Aucun projet"}
          description={filter === "active" ? "Créez un premier espace business." : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const card = p as LauncherProjectCard;
            const next =
              "nextEventAt" in card && card.nextEventAt
                ? format(new Date(card.nextEventAt), "d MMM HH:mm", { locale: fr })
                : null;
            return (
              <div key={p.id} className={`${ui.card} p-5`}>
                <Link href={`/projects/${p.id}`} className="block">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-[12px] text-lg"
                      style={{ background: `${p.color ?? "#8b5cf6"}22` }}
                    >
                      {p.icon || p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-[#f3f0fa]">{p.name}</h2>
                      <p className="text-xs text-[#8b869c]">{p.status === "active" ? "Actif" : "Archivé"}</p>
                    </div>
                  </div>
                  {"openTasks" in card ? (
                    <div className="mt-4 space-y-1 text-sm text-[#8b869c]">
                      <p>
                        {card.openTasks} tâche{card.openTasks > 1 ? "s" : ""}
                      </p>
                      {card.followUps > 0 ? <p>{card.followUps} à relancer</p> : null}
                      {next ? <p>Prochain : {card.nextEventTitle} · {next}</p> : null}
                    </div>
                  ) : null}
                </Link>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className={ui.btnGhost} onClick={() => setEditing(p)}>
                    Modifier
                  </button>
                  {p.status === "active" ? (
                    <button
                      type="button"
                      className={ui.btnGhost}
                      onClick={() => setConfirm({ type: "archive", project: p })}
                    >
                      Archiver
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={ui.btnGhost}
                      onClick={async () => {
                        await fetch(`/api/projects/${p.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "active" }),
                        });
                        router.refresh();
                      }}
                    >
                      Restaurer
                    </button>
                  )}
                  <button
                    type="button"
                    className={ui.btnGhost}
                    onClick={() => setConfirm({ type: "delete", project: p })}
                  >
                    Supprimer
                  </button>
                </div>
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
        open={Boolean(confirm)}
        title={confirm?.type === "delete" ? "Supprimer ce projet ?" : "Archiver ce projet ?"}
        description={
          confirm?.type === "delete"
            ? "Les données restent, sans projet associé (Sans projet)."
            : undefined
        }
        tone={confirm?.type === "delete" ? "danger" : "default"}
        confirmLabel={confirm?.type === "delete" ? "Supprimer" : "Archiver"}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.type === "delete") {
            await fetch(`/api/projects/${confirm.project.id}`, { method: "DELETE" });
          } else {
            await fetch(`/api/projects/${confirm.project.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "archived" }),
            });
          }
          setConfirm(null);
          router.refresh();
        }}
      />
    </div>
  );
}
