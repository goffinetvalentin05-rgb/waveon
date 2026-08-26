import {
  IconBriefcase,
  IconCalendarEvent,
  IconChartBar,
  IconChecklist,
  IconLanguage,
  IconUserCheck,
} from "@tabler/icons-react";
import type { AppModule, CrmSubNavItem } from "@/modules/types";

/**
 * Registre central des modules.
 * Ajouter un module ici suffit pour le faire apparaître
 * dans la sidebar et/ou sur le hub d'accueil.
 */
export const APP_MODULES: AppModule[] = [
  {
    id: "crm",
    label: "Prospection",
    description: "Pipeline, relances et clients",
    href: "/crm",
    icon: IconBriefcase,
    navOrder: 2,
    homeOrder: 1,
    homeSummaryId: "crm-follow-ups",
    accent: {
      iconBg: "bg-indigo-50",
      iconColor: "text-wo-accent",
    },
  },
  {
    id: "english",
    label: "English",
    description: "Vocabulaire et répétition espacée",
    href: "/english",
    icon: IconLanguage,
    navOrder: 3,
    homeOrder: 3,
    homeSummaryId: "english-review",
    accent: {
      iconBg: "bg-indigo-50",
      iconColor: "text-wo-accent",
    },
  },
  {
    id: "calendar",
    label: "Calendrier",
    description: "Journées, rendez-vous et salles",
    href: "/calendar",
    icon: IconCalendarEvent,
    navOrder: 4,
    homeOrder: 2,
    homeSummaryId: "calendar-today",
    accent: {
      iconBg: "bg-indigo-50",
      iconColor: "text-wo-accent",
    },
  },
  {
    id: "tasks",
    label: "Tâches",
    description: "Organisation du quotidien",
    href: "/tasks",
    icon: IconChecklist,
    navOrder: 5,
    homeOrder: 4,
    homeSummaryId: "tasks-today",
    accent: {
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-300",
    },
  },
];

/** Sous-navigation interne du module CRM. */
export const CRM_SUB_NAV: CrmSubNavItem[] = [
  { href: "/crm/today", label: "Relances", icon: IconChecklist },
  { href: "/crm/clients", label: "Clients", icon: IconUserCheck },
  { href: "/crm/stats", label: "Statistiques", icon: IconChartBar },
];

export function getNavModules(): AppModule[] {
  return APP_MODULES.filter((m) => m.navOrder !== null).sort(
    (a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0)
  );
}

export function getHomeModules(): AppModule[] {
  return APP_MODULES.filter((m) => m.homeOrder !== null).sort(
    (a, b) => (a.homeOrder ?? 0) - (b.homeOrder ?? 0)
  );
}

export function getModuleById(id: string): AppModule | undefined {
  return APP_MODULES.find((m) => m.id === id);
}
