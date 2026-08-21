export const PROJECT_MODULE_KEYS = [
  "overview",
  "prospects",
  "tasks",
  "calendar",
  "finances",
  "notes",
  "stats",
  "documents",
] as const;

export type ProjectModuleKey = (typeof PROJECT_MODULE_KEYS)[number];

export const PROJECT_MODULE_LABELS: Record<ProjectModuleKey, string> = {
  overview: "Overview",
  prospects: "Prospects",
  tasks: "Tâches",
  calendar: "Calendrier",
  finances: "Finances",
  notes: "Notes",
  stats: "Stats",
  documents: "Documents",
};

export const DEFAULT_ENABLED_MODULES: ProjectModuleKey[] = [
  "overview",
  "prospects",
  "tasks",
  "calendar",
  "finances",
  "notes",
  "stats",
];

export const PROJECT_TEMPLATES = [
  {
    id: "saas",
    label: "SaaS",
    description: "Produit, roadmap, finances et stats.",
    modules: ["overview", "tasks", "calendar", "finances", "notes", "stats"] as ProjectModuleKey[],
  },
  {
    id: "commercial",
    label: "Business commercial",
    description: "Pipeline, relances, agenda et finances.",
    modules: ["overview", "prospects", "tasks", "calendar", "finances", "notes"] as ProjectModuleKey[],
  },
  {
    id: "simple",
    label: "Projet simple",
    description: "Tâches, calendrier et notes.",
    modules: ["overview", "tasks", "calendar", "notes"] as ProjectModuleKey[],
  },
  {
    id: "custom",
    label: "Custom",
    description: "Choisissez les modules un par un.",
    modules: ["overview"] as ProjectModuleKey[],
  },
] as const;

export type ProjectTemplateId = (typeof PROJECT_TEMPLATES)[number]["id"];

export function isProjectModuleKey(value: unknown): value is ProjectModuleKey {
  return typeof value === "string" && PROJECT_MODULE_KEYS.includes(value as ProjectModuleKey);
}

export function normalizeModules(input: unknown): ProjectModuleKey[] {
  const raw = Array.isArray(input) ? input.filter(isProjectModuleKey) : [];
  const unique = Array.from(new Set<ProjectModuleKey>(["overview", ...raw]));
  return PROJECT_MODULE_KEYS.filter((key) => unique.includes(key));
}

export function hasModule(
  enabled: ProjectModuleKey[] | undefined,
  key: ProjectModuleKey
): boolean {
  if (key === "overview") return true;
  if (!enabled || enabled.length === 0) {
    return DEFAULT_ENABLED_MODULES.includes(key);
  }
  return enabled.includes(key);
}

export function modulesFromRows(
  rows: { module: string; enabled: boolean }[] | null | undefined
): ProjectModuleKey[] {
  if (!rows || rows.length === 0) return [...DEFAULT_ENABLED_MODULES];
  return PROJECT_MODULE_KEYS.filter((key) =>
    rows.some((row) => row.module === key && row.enabled)
  );
}
