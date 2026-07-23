import {
  IconBriefcase,
  IconCalendarEvent,
  IconChartBar,
  IconChecklist,
  IconLanguage,
  IconUsers,
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
    label: "CRM",
    description: "Gérer mes prospects et mes clients",
    href: "/crm",
    icon: IconBriefcase,
    navOrder: 2,
    homeOrder: 1,
    homeSummaryId: "crm-follow-ups",
    accent: {
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  },
  {
    id: "calendar",
    label: "Calendrier",
    description: "Organiser mes journées et mes événements",
    href: "/calendar",
    icon: IconCalendarEvent,
    navOrder: 3,
    homeOrder: 2,
    homeSummaryId: "calendar-today",
    accent: {
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
  },
  {
    id: "english",
    label: "Anglais",
    description: "Enregistrer et réviser mon vocabulaire",
    href: "/english",
    icon: IconLanguage,
    navOrder: 4,
    homeOrder: 3,
    homeSummaryId: "english-review",
    accent: {
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
  },
];

/** Sous-navigation interne du module CRM. */
export const CRM_SUB_NAV: CrmSubNavItem[] = [
  { href: "/crm/prospects", label: "Prospects", icon: IconUsers },
  { href: "/crm/today", label: "Aujourd'hui", icon: IconChecklist },
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
