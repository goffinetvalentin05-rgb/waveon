import type { ComponentType } from "react";

export type ModuleIcon = ComponentType<{ className?: string; stroke?: number }>;

export type HomeSummaryId = "crm-follow-ups" | "calendar-today" | "english-review";

export type HomeSummary = {
  label: string;
  value: number;
  secondaryLabel?: string;
};

export type AppModule = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: ModuleIcon;
  /** Ordre dans la sidebar (null = hors nav principale). */
  navOrder: number | null;
  /** Ordre sur le hub d'accueil (null = hors hub). */
  homeOrder: number | null;
  /** Indicateur résumé optionnel sur la carte d'accueil. */
  homeSummaryId?: HomeSummaryId;
  /** Accent discret pour la carte hub. */
  accent: {
    iconBg: string;
    iconColor: string;
  };
};

export type CrmSubNavItem = {
  href: string;
  label: string;
  icon: ModuleIcon;
};
