"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import type { Project } from "@/lib/projects/types";

export function ProjectSwitcher({
  projects,
  currentId,
  suffix = "",
}: {
  projects: Project[];
  currentId: string;
  suffix?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = projects.find((p) => p.id === currentId);
  const pathname = usePathname();
  const rest = suffix || inferSuffix(pathname, currentId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-wo-border bg-white px-3.5 py-2 text-sm font-medium text-wo-text transition hover:border-indigo-200"
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: current?.color ?? "#6366F1" }}
        />
        {current?.name ?? "Projet"}
        <IconChevronDown className="h-4 w-4 text-wo-muted" />
      </button>
      {open ? (
        <div className="wo-modal absolute left-0 z-30 mt-2 w-56 overflow-hidden p-1">
          {projects
            .filter((p) => p.status === "active")
            .map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}${rest}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm ${
                  p.id === currentId ? "bg-wo-hover text-wo-text" : "text-wo-secondary hover:bg-wo-hover"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? "#6366F1" }} />
                {p.name}
              </Link>
            ))}
          <Link
            href="/projects"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-[10px] border-t border-wo-border px-3 py-2 text-sm text-wo-muted hover:bg-wo-hover hover:text-wo-text"
          >
            Tous les projets
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function inferSuffix(pathname: string | null, currentId: string): string {
  if (!pathname) return "";
  const prefix = `/projects/${currentId}`;
  if (!pathname.startsWith(prefix)) return "";
  return pathname.slice(prefix.length) || "";
}
