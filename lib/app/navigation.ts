import type { ProjectModuleKey } from "@/lib/projects/modules";
import type { ModuleIcon } from "@/modules/types";
import {
  IconBolt,
  IconCalendarEvent,
  IconCash,
  IconChartBar,
  IconChecklist,
  IconFileText,
  IconHome,
  IconLanguage,
  IconLayoutDashboard,
  IconNote,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconActivity,
  IconUsers,
  IconUserCheck,
  IconUserCircle,
  IconUserPlus,
  IconColumns3,
} from "@tabler/icons-react";

export type NavLink = {
  href: string;
  label: string;
  icon: ModuleIcon;
  match?: "exact" | "prefix";
};

export const PERSONAL_NAV: NavLink[] = [
  { href: "/personal/calendar", label: "Calendrier", icon: IconCalendarEvent, match: "prefix" },
  { href: "/personal/notes", label: "Notes", icon: IconNote, match: "prefix" },
  { href: "/personal/english", label: "Anglais", icon: IconLanguage, match: "prefix" },
];

export type ProjectNavItem = {
  key: string;
  label: string;
  suffix: string;
  icon: ModuleIcon;
  module?: ProjectModuleKey;
  exact?: boolean;
  always?: boolean;
  group?: "primary" | "more";
};

export const PROJECT_NAV: ProjectNavItem[] = [
  { key: "overview", label: "Dashboard", suffix: "", icon: IconLayoutDashboard, module: "overview", exact: true, always: true, group: "primary" },
  { key: "prospects", label: "Prospects", suffix: "/prospects", icon: IconUsers, module: "prospects", group: "primary" },
  { key: "pipeline", label: "Pipeline", suffix: "/pipeline", icon: IconColumns3, module: "prospects", group: "primary" },
  { key: "calendar", label: "Calendrier", suffix: "/calendar", icon: IconCalendarEvent, module: "calendar", group: "primary" },
  { key: "tasks", label: "To-do list", suffix: "/tasks", icon: IconChecklist, module: "tasks", group: "primary" },
  { key: "search", label: "Recherche", suffix: "/search", icon: IconSearch, module: "prospects", group: "more" },
  { key: "clients", label: "Clients", suffix: "/clients", icon: IconUserCheck, module: "prospects", group: "more" },
  { key: "automations", label: "Automatisations", suffix: "/automations", icon: IconBolt, module: "prospects", group: "more" },
  { key: "content", label: "Contenu", suffix: "/content", icon: IconSparkles, module: "content", group: "more" },
  { key: "notes", label: "Notes", suffix: "/notes", icon: IconNote, module: "notes", group: "more" },
  { key: "activity", label: "Activité", suffix: "/activity", icon: IconActivity, module: "activity", group: "more" },
  { key: "finances", label: "Finances", suffix: "/finances", icon: IconCash, module: "finances", group: "more" },
  { key: "stats", label: "Statistiques", suffix: "/stats", icon: IconChartBar, module: "stats", group: "more" },
  { key: "documents", label: "Documents", suffix: "/documents", icon: IconFileText, module: "documents", group: "more" },
  { key: "members", label: "Membres", suffix: "/members", icon: IconUserPlus, always: true, group: "more" },
  { key: "settings", label: "Paramètres", suffix: "/settings", icon: IconSettings, always: true, group: "more" },
];

export const PROJECT_PRIMARY_NAV = PROJECT_NAV.filter((item) => item.group !== "more");
export const PROJECT_MORE_NAV = PROJECT_NAV.filter((item) => item.group === "more");

export const BOTTOM_NAV: NavLink[] = [
  { href: "/settings", label: "Paramètres", icon: IconSettings, match: "prefix" },
];

export const MOBILE_TABS: NavLink[] = [
  { href: "/home", label: "Dashboard", icon: IconHome, match: "exact" },
  { href: "/projects", label: "Prospection", icon: IconLayoutDashboard, match: "prefix" },
  { href: "/personal", label: "Personnel", icon: IconUserCircle, match: "prefix" },
];

export type PageMeta = {
  title: string;
  subtitle?: string;
};

export function pageMetaFromPath(pathname: string | null, projectName?: string | null): PageMeta {
  if (!pathname) return { title: "Raven" };

  if (pathname === "/home") return { title: "Dashboard" };
  if (pathname === "/personal") return { title: "Espace personnel" };
  if (pathname.startsWith("/personal/calendar")) return { title: "Calendrier personnel" };
  if (pathname.startsWith("/personal/tasks")) return { title: "To-do list personnelle" };
  if (pathname.startsWith("/personal/notes")) return { title: "Notes" };
  if (pathname.startsWith("/personal/english")) return { title: "Anglais" };
  if (pathname === "/projects") return { title: "Projets" };
  if (pathname === "/settings") return { title: "Paramètres" };
  if (pathname.startsWith("/notifications")) return { title: "Notifications" };

  const projectMatch = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (projectMatch && projectMatch[1] !== "unassigned") {
    const rest = projectMatch[2] ?? "";
    if (rest.startsWith("prospects/") && rest !== "prospects") {
      return { title: "Prospect", subtitle: projectName ?? undefined };
    }
    const item = PROJECT_NAV.find((nav) =>
      nav.exact ? rest === "" : rest === nav.suffix.slice(1) || rest.startsWith(`${nav.suffix.slice(1)}/`)
    );
    return {
      title: item?.label ?? "Dashboard",
      subtitle: projectName ?? undefined,
    };
  }

  if (pathname.startsWith("/projects/unassigned")) {
    return { title: "Sans projet" };
  }

  return { title: "Raven" };
}

export function isNavActive(pathname: string | null, href: string, match: "exact" | "prefix" = "prefix"): boolean {
  if (!pathname) return false;
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isProjectNavActive(pathname: string | null, href: string, exact?: boolean): boolean {
  if (!pathname) return false;
  if (exact) return pathname === href;
  if (href.endsWith("/prospects")) {
    return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.includes("/pipeline"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
