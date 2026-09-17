import type { ProjectModuleKey } from "@/lib/projects/modules";
import type { ModuleIcon } from "@/modules/types";
import {
  IconCalendarEvent,
  IconCash,
  IconChartBar,
  IconChecklist,
  IconFileText,
  IconHome,
  IconLanguage,
  IconLayoutDashboard,
  IconNote,
  IconSettings,
  IconSparkles,
  IconActivity,
  IconUsers,
  IconUserCheck,
  IconColumns3,
  IconFolders,
} from "@tabler/icons-react";

export type NavLink = {
  href: string;
  label: string;
  icon: ModuleIcon;
  match?: "exact" | "prefix";
};

export const PERSONAL_NAV: NavLink[] = [
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

/**
 * `primary` = navigation principale de la sidebar.
 * `more` = routes conservées, hors sidebar.
 */
export const PROJECT_NAV: ProjectNavItem[] = [
  { key: "overview", label: "Dashboard", suffix: "", icon: IconLayoutDashboard, module: "overview", exact: true, always: true, group: "primary" },
  { key: "prospects", label: "Prospects", suffix: "/prospects", icon: IconUsers, module: "prospects", group: "primary" },
  { key: "pipeline", label: "Pipeline", suffix: "/pipeline", icon: IconColumns3, module: "prospects", group: "primary" },
  { key: "calendar", label: "Calendrier", suffix: "/calendar", icon: IconCalendarEvent, module: "calendar", group: "primary" },
  { key: "tasks", label: "To-do list", suffix: "/tasks", icon: IconChecklist, module: "tasks", group: "primary" },
  { key: "clients", label: "Clients", suffix: "/clients", icon: IconUserCheck, module: "prospects", group: "more" },
  { key: "content", label: "Contenu", suffix: "/content", icon: IconSparkles, module: "content", group: "more" },
  { key: "notes", label: "Notes", suffix: "/notes", icon: IconNote, module: "notes", group: "more" },
  { key: "activity", label: "Activité", suffix: "/activity", icon: IconActivity, module: "activity", group: "more" },
  { key: "finances", label: "Finances", suffix: "/finances", icon: IconCash, module: "finances", group: "more" },
  { key: "stats", label: "Statistiques", suffix: "/stats", icon: IconChartBar, module: "stats", group: "more" },
  { key: "documents", label: "Documents", suffix: "/documents", icon: IconFileText, module: "documents", group: "more" },
  { key: "settings", label: "Paramètres du projet", suffix: "/settings", icon: IconSettings, always: true, group: "more" },
];

export const PROJECT_PRIMARY_NAV = PROJECT_NAV.filter((item) => item.group !== "more");
export const PROJECT_MORE_NAV = PROJECT_NAV.filter((item) => item.group === "more");

export const BOTTOM_NAV: NavLink[] = [
  { href: "/settings", label: "Paramètres", icon: IconSettings, match: "prefix" },
];

export const MOBILE_TABS: NavLink[] = [
  { href: "/home", label: "Dashboard", icon: IconHome, match: "exact" },
  { href: "/projects", label: "Projets", icon: IconFolders, match: "exact" },
];

export type PageMeta = {
  title: string;
  subtitle?: string;
  hideTitle?: boolean;
};

const PAGE_SUBTITLES: Record<string, string> = {
  Dashboard: "Vue d’ensemble de votre prospection",
  Prospects: "Tous les prospects du projet",
  Pipeline: "Avancement par étape",
  Calendrier: "Rendez-vous et échéances du projet",
  "To-do list": "Vos tâches sur ce projet",
};

export function pageMetaFromPath(pathname: string | null, projectName?: string | null): PageMeta {
  if (!pathname) return { title: "Raven" };

  if (pathname === "/home") return { title: "Dashboard", hideTitle: true };
  if (pathname === "/personal") return { title: "Espace personnel" };
  if (pathname.startsWith("/personal/calendar")) return { title: "Calendrier personnel" };
  if (pathname.startsWith("/personal/tasks")) return { title: "To-do list personnelle" };
  if (pathname.startsWith("/personal/notes")) return { title: "Notes" };
  if (pathname.startsWith("/personal/english")) return { title: "Anglais" };
  if (pathname === "/projects") {
    return {
      title: "Vos projets",
      subtitle: "Choisissez l’espace dans lequel vous souhaitez travailler.",
      hideTitle: true,
    };
  }
  if (pathname === "/settings") return { title: "Paramètres", subtitle: "Compte, projet, membres et préférences" };
  if (pathname.startsWith("/notifications")) return { title: "Notifications" };

  const projectMatch = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (projectMatch && projectMatch[1] !== "unassigned") {
    const rest = projectMatch[2] ?? "";
    if (rest.startsWith("prospects/") && rest !== "prospects") {
      return { title: "Prospect", subtitle: projectName ?? undefined };
    }
    if (rest === "members") {
      return { title: "Membres", subtitle: projectName ?? undefined };
    }
    const item = PROJECT_NAV.find((nav) =>
      nav.exact ? rest === "" : rest === nav.suffix.slice(1) || rest.startsWith(`${nav.suffix.slice(1)}/`)
    );
    const title = item?.label ?? "Dashboard";
    return {
      title,
      subtitle: PAGE_SUBTITLES[title] ?? projectName ?? undefined,
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
  if (href.endsWith("/settings")) {
    return pathname === href || pathname === href.replace("/settings", "/members");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
