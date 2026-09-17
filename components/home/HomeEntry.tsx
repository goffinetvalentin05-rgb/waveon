"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconPlus,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ACTIVE_PROJECT_STORAGE_KEY, readStoredId, writeStoredId } from "@/lib/app/workspace";
import type { Project } from "@/lib/projects/types";

export function HomeEntry({
  firstName,
  projects,
}: {
  firstName: string;
  projects: Project[];
  personalLocked: boolean;
}) {
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const active = projects.filter((p) => p.status === "active");

  useEffect(() => {
    const list = projects.filter((p) => p.status === "active");
    if (list.length === 0) return;
    const stored = readStoredId(ACTIVE_PROJECT_STORAGE_KEY);
    const target = list.find((p) => p.id === stored) ?? list[0];
    if (!target) return;
    writeStoredId(ACTIVE_PROJECT_STORAGE_KEY, target.id);
    router.replace(`/projects/${target.id}`);
  }, [projects, router]);

  if (active.length > 0) {
    return <p className="text-sm text-wo-dim">Ouverture du dashboard…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-10 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-wo-text">
          Bonjour {firstName}
        </h1>
        <p className="mt-2 text-sm text-wo-muted">
          Créez un projet pour rechercher des prospects, les contacter et suivre le pipeline.
        </p>
      </div>
      <button type="button" className={`${ui.btnPrimary} mx-auto`} onClick={() => setCreate(true)}>
        <IconPlus className="h-4 w-4" />
        Créer un projet
      </button>
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
