export const PROJECT_MODULE_KEYS = [
  "overview",
  "prospects",
  "companies",
  "tasks",
  "content",
  "notes",
  "activity",
  "calendar",
  "finances",
  "stats",
  "documents",
] as const;

export type ProjectModuleKey = (typeof PROJECT_MODULE_KEYS)[number];

export const PROJECT_MODULE_LABELS: Record<ProjectModuleKey, string> = {
  overview: "Vue d'ensemble",
  prospects: "Prospects",
  companies: "Entreprises",
  tasks: "Tâches",
  content: "Contenu",
  notes: "Notes",
  activity: "Activité",
  calendar: "Calendrier",
  finances: "Finances",
  stats: "Statistiques",
  documents: "Documents",
};

/** Modules proposés dans l’UI. `companies` reste en base pour compatibilité, plus exposé. */
export const SELECTABLE_MODULE_KEYS: ProjectModuleKey[] = PROJECT_MODULE_KEYS.filter(
  (key) => key !== "companies"
);

export const DEFAULT_ENABLED_MODULES: ProjectModuleKey[] = [
  "overview",
  "prospects",
  "tasks",
  "content",
  "notes",
  "activity",
  "calendar",
  "finances",
  "stats",
];

export const PROJECT_TEMPLATES = [
  {
    id: "saas",
    label: "SaaS",
    description: "Produit, contenu, finances et stats.",
    modules: ["overview", "tasks", "content", "notes", "activity", "calendar", "finances", "stats"] as ProjectModuleKey[],
  },
  {
    id: "commercial",
    label: "Business commercial",
    description: "Pipeline, relances, contenu et collaboration.",
    modules: [
      "overview",
      "prospects",
      "tasks",
      "content",
      "notes",
      "activity",
      "calendar",
      "finances",
    ] as ProjectModuleKey[],
  },
  {
    id: "simple",
    label: "Projet simple",
    description: "Tâches, notes et activité.",
    modules: ["overview", "tasks", "notes", "activity", "calendar"] as ProjectModuleKey[],
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
  const set = new Set<ProjectModuleKey>(["overview", ...raw]);
  set.delete("companies");
  return SELECTABLE_MODULE_KEYS.filter((key) => set.has(key));
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
  const byKey = new Map(rows.map((row) => [row.module, row.enabled]));
  return SELECTABLE_MODULE_KEYS.filter((key) => {
    const stored = byKey.get(key);
    if (stored === undefined) return DEFAULT_ENABLED_MODULES.includes(key);
    return stored;
  });
}
