import type { ProjectRole } from "@/lib/access/roles";
import type { ProjectModuleKey } from "@/lib/projects/modules";
import { DEFAULT_PROJECT_COLOR } from "@/lib/projects/logo";

export const PROJECT_STATUSES = ["active", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Conservé pour les projets existants. Les nouveaux projets utilisent indigo. */
export const PROJECT_COLORS = [DEFAULT_PROJECT_COLOR] as const;

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  logo_url?: string | null;
  color: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  enabledModules?: ProjectModuleKey[];
  myRole?: ProjectRole;
  join_code?: string | null;
};

export type ProjectSummary = Project & {
  prospectsCount: number;
  followUpsToday: number;
  demosUpcoming: number;
  clientsCount: number;
  potentialValue: number;
};
