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
        className="inline-flex items-center gap-2 rounded-[12px] border border-white/[0.08] bg-[#14121c] px-3 py-2 text-sm font-medium text-[#f3f0fa]"
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: current?.color ?? "#8b5cf6" }}
        />
        {current?.name ?? "Projet"}
        <IconChevronDown className="h-4 w-4 text-[#8b869c]" />
      </button>
      {open ? (
        <div className="absolute left-0 z-30 mt-2 w-56 overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#16141f] p-1 shadow-xl">
          {projects
            .filter((p) => p.status === "active")
            .map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}${rest}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm ${
                  p.id === currentId ? "bg-white/[0.06] text-[#f3f0fa]" : "text-[#c8c3d6] hover:bg-white/[0.04]"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? "#8b5cf6" }} />
                {p.name}
              </Link>
            ))}
          <Link
            href="/projects"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-[10px] border-t border-white/[0.06] px-3 py-2 text-sm text-[#8b869c] hover:bg-white/[0.04] hover:text-[#f3f0fa]"
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
