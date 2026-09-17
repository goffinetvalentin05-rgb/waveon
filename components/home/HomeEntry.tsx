"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { RavenLogo } from "@/components/brand/Logo";
import { ui } from "@/lib/design/tokens";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ACTIVE_PROJECT_STORAGE_KEY, writeStoredId } from "@/lib/app/workspace";
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
    if (list.length === 1) {
      writeStoredId(ACTIVE_PROJECT_STORAGE_KEY, list[0].id);
      router.replace(`/projects/${list[0].id}`);
      return;
    }
    router.replace("/projects");
  }, [projects, router]);

  if (active.length > 0) {
    return <p className="text-sm text-wo-dim">Ouverture de Raven…</p>;
  }

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <div className="flex flex-col items-center">
        <RavenLogo size="lg" />
        <p className="mt-4 text-[10.5px] font-medium uppercase tracking-[0.18em] text-wo-dim">{brand.tagline}</p>
        <h1 className="mt-4 font-display text-[2rem] font-semibold tracking-tight text-wo-text">
          Bienvenue sur Raven
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-wo-muted">
          Bonjour {firstName}. Créez votre premier espace de prospection.
        </p>
      </div>
      <button type="button" className={`${ui.btnPrimary} mx-auto mt-8`} onClick={() => setCreate(true)}>
        <IconPlus className="h-4 w-4" />
        Créer mon premier projet
      </button>
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
