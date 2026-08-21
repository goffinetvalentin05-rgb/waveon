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
        className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0c1916] px-3.5 py-2 text-sm font-medium text-[#eef6f2] transition hover:border-emerald-400/25"
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: current?.color ?? "#10b981" }}
        />
        {current?.name ?? "Projet"}
        <IconChevronDown className="h-4 w-4 text-[#8a9e96]" />
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
                  p.id === currentId ? "bg-white/[0.06] text-[#eef6f2]" : "text-[#c2d4cc] hover:bg-white/[0.04]"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? "#10b981" }} />
                {p.name}
              </Link>
            ))}
          <Link
            href="/projects"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-[10px] border-t border-white/[0.06] px-3 py-2 text-sm text-[#8a9e96] hover:bg-white/[0.04] hover:text-[#eef6f2]"
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
