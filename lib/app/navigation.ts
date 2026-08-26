import type { ProjectModuleKey } from "@/lib/projects/modules";
import type { ModuleIcon } from "@/modules/types";
import {
  IconBuilding,
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
  IconUserCircle,
  IconUserPlus,
} from "@tabler/icons-react";

export type NavLink = {
  href: string;
  label: string;
  icon: ModuleIcon;
  match?: "exact" | "prefix";
};

export const PERSONAL_NAV: NavLink[] = [
  { href: "/personal/calendar", label: "Calendrier", icon: IconCalendarEvent, match: "prefix" },
  { href: "/personal/tasks", label: "Tâches", icon: IconChecklist, match: "prefix" },
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
};

export const PROJECT_NAV: ProjectNavItem[] = [
  { key: "overview", label: "Vue d'ensemble", suffix: "", icon: IconLayoutDashboard, module: "overview", exact: true, always: true },
  { key: "prospects", label: "Prospects", suffix: "/prospects", icon: IconUsers, module: "prospects" },
  { key: "companies", label: "Entreprises", suffix: "/companies", icon: IconBuilding, module: "companies" },
  { key: "tasks", label: "Tâches", suffix: "/tasks", icon: IconChecklist, module: "tasks" },
  { key: "content", label: "Contenu", suffix: "/content", icon: IconSparkles, module: "content" },
  { key: "notes", label: "Notes", suffix: "/notes", icon: IconNote, module: "notes" },
  { key: "activity", label: "Activité", suffix: "/activity", icon: IconActivity, module: "activity" },
  { key: "calendar", label: "Calendrier", suffix: "/calendar", icon: IconCalendarEvent, module: "calendar" },
  { key: "finances", label: "Finances", suffix: "/finances", icon: IconCash, module: "finances" },
  { key: "stats", label: "Statistiques", suffix: "/stats", icon: IconChartBar, module: "stats" },
  { key: "documents", label: "Documents", suffix: "/documents", icon: IconFileText, module: "documents" },
  { key: "members", label: "Membres", suffix: "/members", icon: IconUserPlus, always: true },
  { key: "settings", label: "Paramètres", suffix: "/settings", icon: IconSettings, always: true },
];

export const BOTTOM_NAV: NavLink[] = [
  { href: "/settings", label: "Paramètres", icon: IconSettings, match: "prefix" },
];

export const MOBILE_TABS: NavLink[] = [
  { href: "/home", label: "Accueil", icon: IconHome, match: "exact" },
  { href: "/personal", label: "Personnel", icon: IconUserCircle, match: "prefix" },
  { href: "/projects", label: "Projets", icon: IconLayoutDashboard, match: "prefix" },
];

export type PageMeta = {
  title: string;
  subtitle?: string;
};

export function pageMetaFromPath(pathname: string | null, projectName?: string | null): PageMeta {
  if (!pathname) return { title: "WaveOne" };

  if (pathname === "/home") {
    return { title: "Tableau de bord", subtitle: "Vue d'ensemble de votre workspace." };
  }
  if (pathname === "/personal") {
    return { title: "Personnel", subtitle: "Espace privé, uniquement pour vous." };
  }
  if (pathname.startsWith("/personal/calendar")) {
    return { title: "Calendrier", subtitle: "Agenda et rappels personnels." };
  }
  if (pathname.startsWith("/personal/tasks")) {
    return { title: "Tâches", subtitle: "Vos tâches personnelles." };
  }
  if (pathname.startsWith("/personal/notes")) {
    return { title: "Notes", subtitle: "Notes privées, hors projets." };
  }
  if (pathname.startsWith("/personal/english")) {
    return { title: "Anglais", subtitle: "Vocabulaire et révisions." };
  }
  if (pathname === "/projects") {
    return { title: "Projets", subtitle: "Tous vos espaces de collaboration." };
  }
  if (pathname === "/settings") {
    return { title: "Paramètres", subtitle: "Compte, sécurité et préférences." };
  }
  if (pathname.startsWith("/notifications")) {
    return { title: "Notifications", subtitle: "Ce qui demande votre attention." };
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (projectMatch && projectMatch[1] !== "unassigned") {
    const rest = projectMatch[2] ?? "";
    const item = PROJECT_NAV.find((nav) =>
      nav.exact ? rest === "" : rest === nav.suffix.slice(1) || rest.startsWith(`${nav.suffix.slice(1)}/`)
    );
    const section = item?.label ?? "Vue d'ensemble";
    return {
      title: projectName || "Projet",
      subtitle: section,
    };
  }

  if (pathname.startsWith("/projects/unassigned")) {
    return { title: "Sans projet", subtitle: "Éléments à rattacher à un projet." };
  }

  return { title: "WaveOne" };
}

export function isNavActive(pathname: string | null, href: string, match: "exact" | "prefix" = "prefix"): boolean {
  if (!pathname) return false;
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
