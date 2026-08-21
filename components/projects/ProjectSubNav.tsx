"use client";

import {
  IconCalendarEvent,
  IconCash,
  IconChartBar,
  IconChecklist,
  IconFileText,
  IconLayoutDashboard,
  IconNote,
  IconUsers,
} from "@tabler/icons-react";
import { SubNav } from "@/components/ui/SubNav";
import { hasModule, PROJECT_MODULE_LABELS, type ProjectModuleKey } from "@/lib/projects/modules";
import type { ModuleIcon } from "@/modules/types";

const ITEMS: { key: ProjectModuleKey; suffix: string; icon: ModuleIcon; exact?: boolean }[] = [
  { key: "overview", suffix: "", icon: IconLayoutDashboard, exact: true },
  { key: "prospects", suffix: "/prospects", icon: IconUsers },
  { key: "tasks", suffix: "/tasks", icon: IconChecklist },
  { key: "calendar", suffix: "/calendar", icon: IconCalendarEvent },
  { key: "finances", suffix: "/finances", icon: IconCash },
  { key: "notes", suffix: "/notes", icon: IconNote },
  { key: "stats", suffix: "/stats", icon: IconChartBar },
  { key: "documents", suffix: "/documents", icon: IconFileText },
];

export function ProjectSubNav({
  projectId,
  enabledModules,
}: {
  projectId: string;
  enabledModules?: ProjectModuleKey[];
}) {
  const base = `/projects/${projectId}`;
  return (
    <SubNav
      ariaLabel="Navigation projet"
      items={ITEMS.filter((item) => hasModule(enabledModules, item.key)).map((item) => ({
        href: `${base}${item.suffix}`,
        label: PROJECT_MODULE_LABELS[item.key],
        icon: item.icon,
        exact: item.exact,
      }))}
    />
  );
}
