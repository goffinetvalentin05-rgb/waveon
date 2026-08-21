import type { ProjectModuleKey } from "@/lib/projects/modules";

export const PROJECT_STATUSES = ["active", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_COLORS = [
  "#8b5cf6",
  "#34d399",
  "#38bdf8",
  "#fbbf24",
  "#f43f5e",
  "#fb7185",
  "#a78bfa",
  "#2dd4bf",
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
};

export type ProjectSummary = Project & {
  prospectsCount: number;
  followUpsToday: number;
  demosUpcoming: number;
  clientsCount: number;
  potentialValue: number;
};
