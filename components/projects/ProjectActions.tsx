"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import type { Project } from "@/lib/projects/types";

export function ProjectActions({ project }: { project: Project }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={ui.btnSecondary} onClick={() => setEdit(true)}>
        Modifier
      </button>
      {project.status === "active" ? (
        <button type="button" className={ui.btnGhost} onClick={() => setConfirm("archive")}>
          Archiver
        </button>
      ) : (
        <button
          type="button"
          className={ui.btnGhost}
          onClick={async () => {
            await fetch(`/api/projects/${project.id}`, {
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
      <button type="button" className={ui.btnGhost} onClick={() => setConfirm("delete")}>
        Supprimer
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

      <ConfirmModal
        open={confirm === "archive"}
        title="Archiver ce projet ?"
        confirmLabel="Archiver"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "archived" }),
          });
          setConfirm(null);
          router.refresh();
        }}
      />
      <ConfirmModal
        open={confirm === "delete"}
        title="Supprimer ce projet ?"
        description="Les prospects, tâches et dépenses resteront, sans projet associé."
        tone="danger"
        confirmLabel="Supprimer"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
          router.push("/home");
          router.refresh();
        }}
      />
    </div>
  );
}
