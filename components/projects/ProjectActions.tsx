"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DeleteProjectModal } from "@/components/projects/DeleteProjectModal";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { can, canLeaveProject } from "@/lib/access/permissions";
import type { Project } from "@/lib/projects/types";
import type { ProjectRole } from "@/lib/access/roles";

export function ProjectActions({ project }: { project: Project }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={ui.btnSecondary} onClick={() => setEdit(true)}>
        Modifier
      </button>

      {edit ? (
        <ProjectFormModal
          project={project}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

export function ProjectDangerZone({
  project,
  role,
  currentUserId,
}: {
  project: Project;
  role: ProjectRole;
  currentUserId: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<"archive" | "restore" | "leave" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canArchive = can(role, "project.archive");
  const canDelete = can(role, "project.delete");
  const canLeave = canLeaveProject(role);

  if (!canArchive && !canDelete && !canLeave) return null;

  return (
    <section className="mt-8 rounded-2xl border border-rose-200 bg-rose-50/50 p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-rose-800">Zone dangereuse</h3>
      <p className="mt-1 text-sm text-rose-700/80">
        L&apos;archivage conserve les données. La suppression est irréversible et ne touche pas les espaces
        Personnel.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canLeave ? (
          <button type="button" className={ui.btnSecondary} onClick={() => setConfirm("leave")}>
            Quitter le projet
          </button>
        ) : null}
        {canArchive && project.status === "active" ? (
          <button type="button" className={ui.btnSecondary} onClick={() => setConfirm("archive")}>
            Archiver le projet
          </button>
        ) : null}
        {canArchive && project.status === "archived" ? (
          <button type="button" className={ui.btnSecondary} onClick={() => setConfirm("restore")}>
            Restaurer le projet
          </button>
        ) : null}
        {canDelete ? (
          <button type="button" className={ui.btnDanger} onClick={() => setDeleteOpen(true)}>
            Supprimer définitivement
          </button>
        ) : null}
      </div>

      <ConfirmModal
        open={confirm === "archive"}
        title={`Archiver ${project.name} ?`}
        description="Le projet disparaîtra de la liste principale. Les données et les membres sont conservés. Vous pourrez le restaurer depuis Projets archivés."
        confirmLabel="Archiver"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "archived" }),
          });
          setConfirm(null);
          router.push("/projects?filter=archived");
          router.refresh();
        }}
      />
      <ConfirmModal
        open={confirm === "restore"}
        title={`Restaurer ${project.name} ?`}
        confirmLabel="Restaurer"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "active" }),
          });
          setConfirm(null);
          router.refresh();
        }}
      />
      <ConfirmModal
        open={confirm === "leave"}
        title={`Quitter ${project.name} ?`}
        description="Vous perdrez l'accès à ce projet. Votre compte et votre espace Personnel restent intacts."
        tone="danger"
        confirmLabel="Quitter"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await fetch(`/api/projects/${project.id}/members/${currentUserId}`, { method: "DELETE" });
          setConfirm(null);
          router.push("/projects");
          router.refresh();
        }}
      />
      {deleteOpen ? (
        <DeleteProjectModal
          projectName={project.name}
          loading={deleting}
          error={deleteError}
          onCancel={() => {
            if (deleting) return;
            setDeleteOpen(false);
            setDeleteError(null);
          }}
          onConfirm={async (confirmName) => {
            setDeleting(true);
            setDeleteError(null);
            const res = await fetch(`/api/projects/${project.id}`, {
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
            router.push("/projects");
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}
