"use client";

import {
  IconCash,
  IconChartBar,
  IconChecklist,
  IconLayoutDashboard,
  IconNote,
  IconUsers,
} from "@tabler/icons-react";
import { SubNav } from "@/components/ui/SubNav";

export function ProjectSubNav({ projectId }: { projectId: string }) {
  const base = `/projects/${projectId}`;
  return (
    <SubNav
      ariaLabel="Navigation projet"
      items={[
        { href: base, label: "Overview", icon: IconLayoutDashboard, exact: true },
        { href: `${base}/prospects`, label: "Prospects", icon: IconUsers },
        { href: `${base}/tasks`, label: "Tâches", icon: IconChecklist },
        { href: `${base}/finances`, label: "Finances", icon: IconCash },
        { href: `${base}/notes`, label: "Notes", icon: IconNote },
        { href: `${base}/stats`, label: "Stats", icon: IconChartBar },
      ]}
    />
  );
}
