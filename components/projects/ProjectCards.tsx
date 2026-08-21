"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import type { ProjectSummary } from "@/lib/projects/types";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { EmptyState } from "@/components/ui/ConfirmModal";

function formatChf(n: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
}

export function ProjectCards({
  projects,
  hrefFor,
}: {
  projects: ProjectSummary[];
  hrefFor: (id: string) => string;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const active = projects.filter((p) => p.status === "active");
  const archived = projects.filter((p) => p.status === "archived");

  return (
    <div className="space-y-6">
      {active.length === 0 ? (
        <EmptyState
          title="Aucun projet"
          description="Crée un premier projet pour séparer tes business."
          action={
            <button type="button" className={ui.btnPrimary} onClick={() => setShowCreate(true)}>
              <IconPlus className="h-4 w-4" />
              Nouveau projet
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((p) => (
            <Link
              key={p.id}
              href={hrefFor(p.id)}
              className={`${ui.cardInteractive} group p-5`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-[12px] text-lg"
                    style={{ background: `${p.color ?? "#8b5cf6"}22`, color: p.color ?? "#8b5cf6" }}
                  >
                    {p.icon || p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-[#f3f0fa]">{p.name}</h2>
                    {p.description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-[#8b869c]">{p.description}</p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-[13px]">
                <Stat label="Prospects" value={String(p.prospectsCount)} />
                <Stat label="À relancer" value={String(p.followUpsToday)} />
                <Stat label="Démos" value={String(p.demosUpcoming)} />
                <Stat label="Clients" value={String(p.clientsCount)} />
              </div>
              {p.potentialValue > 0 ? (
                <p className="mt-4 text-xs text-[#8b869c]">
                  Potentiel {formatChf(p.potentialValue)}
                </p>
              ) : null}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-white/[0.1] text-sm text-[#8b869c] transition hover:border-violet-500/40 hover:text-[#f3f0fa]"
          >
            <IconPlus className="h-5 w-5" />
            Nouveau projet
          </button>
        </div>
      )}

      {archived.length > 0 ? (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#6a6578]">Archivés</h3>
          <div className="flex flex-wrap gap-2">
            {archived.map((p) => (
              <Link
                key={p.id}
                href={hrefFor(p.id)}
                className="rounded-full border border-white/[0.08] px-3 py-1 text-xs text-[#8b869c] hover:text-[#f3f0fa]"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {showCreate ? (
        <ProjectFormModal
          onClose={() => setShowCreate(false)}
          onSaved={(project) => {
            setShowCreate(false);
            router.push(hrefFor(project.id));
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[#6a6578]">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-[#f3f0fa]">{value}</p>
    </div>
  );
}
