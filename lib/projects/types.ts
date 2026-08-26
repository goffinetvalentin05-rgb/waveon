import type { ProjectRole } from "@/lib/access/roles";
import type { ProjectModuleKey } from "@/lib/projects/modules";

export const PROJECT_STATUSES = ["active", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#0EA5E9",
  "#818CF8",
  "#F59E0B",
  "#F43F5E",
  "#A78BFA",
  "#64748B",
] as const;

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
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
