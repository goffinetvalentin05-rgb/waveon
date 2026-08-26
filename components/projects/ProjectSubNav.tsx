"use client";

import { PROJECT_NAV } from "@/lib/app/navigation";
import { SubNav } from "@/components/ui/SubNav";
import { hasModule, type ProjectModuleKey } from "@/lib/projects/modules";

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
      items={PROJECT_NAV.filter((item) => {
        if (item.always) return true;
        if (!item.module) return true;
        return hasModule(enabledModules, item.module);
      }).map((item) => ({
        href: `${base}${item.suffix}`,
        label: item.label,
        icon: item.icon,
        exact: item.exact,
      }))}
    />
  );
}
