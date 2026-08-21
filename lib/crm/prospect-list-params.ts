import { PROSPECT_STATUSES } from "@/lib/crm/types";
import { normalizeSearchText } from "@/lib/crm/search";

export const DEFAULT_SORT_COLUMN = "updated_at";
export const DEFAULT_SORT_ORDER = "desc" as const;
export const DEFAULT_PAGE_SIZE = 25;

export const SORTABLE_COLUMNS = [
  "club_name",
  "sport",
  "canton",
  "contact_name",
  "phone",
  "email",
  "website",
  "status",
  "last_action_at",
  "next_follow_up",
  "potential_value",
] as const;

export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

export type PresenceFilter = "yes" | "no";

/** active = liste principale (défaut), archived = uniquement archivés */
export type ArchivedFilter = "active" | "archived";

export type FollowUpPreset = "today" | "overdue" | null;

export type ProspectListParams = {
  q: string;
  sort: SortableColumn | typeof DEFAULT_SORT_COLUMN;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
  clientsOnly: boolean;
  sports: string[];
  cantons: string[];
  villes: string[];
  statuses: string[];
  hasEmail: PresenceFilter | null;
  hasPhone: PresenceFilter | null;
  nextFollowUpFrom: string;
  nextFollowUpTo: string;
  lastActionFrom: string;
  lastActionTo: string;
  archived: ArchivedFilter;
  projectId: string;
  assignedTo: string;
  tags: string[];
  channel: string;
  followUpPreset: FollowUpPreset;
  minValue: string;
  maxValue: string;
};

export type ProspectListFilters = Omit<
  ProspectListParams,
  "q" | "sort" | "order" | "page" | "pageSize" | "clientsOnly"
>;

export const EMPTY_FILTERS: ProspectListFilters = {
  sports: [],
  cantons: [],
  villes: [],
  statuses: [],
  hasEmail: null,
  hasPhone: null,
  nextFollowUpFrom: "",
  nextFollowUpTo: "",
  lastActionFrom: "",
  lastActionTo: "",
  archived: "active",
  projectId: "",
  assignedTo: "",
  tags: [],
  channel: "",
  followUpPreset: null,
  minValue: "",
  maxValue: "",
};

export function defaultProspectListParams(clientsOnly = false): ProspectListParams {
  return {
    q: "",
    sort: DEFAULT_SORT_COLUMN,
    order: DEFAULT_SORT_ORDER,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    clientsOnly,
    ...EMPTY_FILTERS,
  };
}

function parseMultiParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parsePresence(value: string | null): PresenceFilter | null {
  if (value === "yes" || value === "1") return "yes";
  if (value === "no" || value === "0") return "no";
  return null;
}

export function parseProspectListParams(
  searchParams: URLSearchParams,
  clientsOnly = false
): ProspectListParams {
  const sortParam = searchParams.get("sort") ?? DEFAULT_SORT_COLUMN;
  const sort = (SORTABLE_COLUMNS as readonly string[]).includes(sortParam)
    ? (sortParam as SortableColumn)
    : sortParam === DEFAULT_SORT_COLUMN
      ? DEFAULT_SORT_COLUMN
      : DEFAULT_SORT_COLUMN;

  const orderParam = searchParams.get("order");
  const order = orderParam === "asc" ? "asc" : DEFAULT_SORT_ORDER;

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    500,
    Math.max(10, Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE)
  );

  return {
    q: searchParams.get("search")?.trim() ?? searchParams.get("q")?.trim() ?? "",
    sort,
    order,
    page,
    pageSize,
    clientsOnly: clientsOnly || searchParams.get("clients") === "1",
    sports: parseMultiParam(searchParams.get("sport")),
    cantons: parseMultiParam(searchParams.get("canton")),
    villes: parseMultiParam(searchParams.get("ville")),
    statuses: parseMultiParam(searchParams.get("status")),
    hasEmail: parsePresence(searchParams.get("has_email")),
    hasPhone: parsePresence(searchParams.get("has_phone")),
    nextFollowUpFrom: searchParams.get("next_follow_up_from")?.trim() ?? "",
    nextFollowUpTo: searchParams.get("next_follow_up_to")?.trim() ?? "",
    lastActionFrom: searchParams.get("last_action_from")?.trim() ?? "",
    lastActionTo: searchParams.get("last_action_to")?.trim() ?? "",
    archived:
      searchParams.get("archived") === "1" || searchParams.get("archived") === "archived"
        ? "archived"
        : "active",
    projectId: searchParams.get("project")?.trim() ?? "",
    assignedTo: searchParams.get("assigned")?.trim() ?? "",
    tags: parseMultiParam(searchParams.get("tag")),
    channel: searchParams.get("channel")?.trim() ?? "",
    followUpPreset:
      searchParams.get("follow") === "today" || searchParams.get("follow") === "overdue"
        ? (searchParams.get("follow") as FollowUpPreset)
        : null,
    minValue: searchParams.get("min_value")?.trim() ?? "",
    maxValue: searchParams.get("max_value")?.trim() ?? "",
  };
}

export function buildProspectListSearchParams(
  params: ProspectListParams,
  opts?: { includeDefaults?: boolean }
): URLSearchParams {
  const sp = new URLSearchParams();

  if (params.q) sp.set("search", params.q);
  if (params.clientsOnly) sp.set("clients", "1");

  const isDefaultSort =
    params.sort === DEFAULT_SORT_COLUMN && params.order === DEFAULT_SORT_ORDER;
  if (!isDefaultSort || opts?.includeDefaults) {
    if (params.sort !== DEFAULT_SORT_COLUMN || opts?.includeDefaults) {
      sp.set("sort", params.sort);
    }
    if (params.order !== DEFAULT_SORT_ORDER || opts?.includeDefaults) {
      sp.set("order", params.order);
    }
  }

  if (params.page > 1 || opts?.includeDefaults) sp.set("page", String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE || opts?.includeDefaults) {
    sp.set("pageSize", String(params.pageSize));
  }

  if (params.sports.length) sp.set("sport", params.sports.join(","));
  if (params.cantons.length) sp.set("canton", params.cantons.join(","));
  if (params.villes.length) sp.set("ville", params.villes.join(","));
  if (params.statuses.length) sp.set("status", params.statuses.join(","));
  if (params.hasEmail) sp.set("has_email", params.hasEmail === "yes" ? "1" : "0");
  if (params.hasPhone) sp.set("has_phone", params.hasPhone === "yes" ? "1" : "0");
  if (params.nextFollowUpFrom) sp.set("next_follow_up_from", params.nextFollowUpFrom);
  if (params.nextFollowUpTo) sp.set("next_follow_up_to", params.nextFollowUpTo);
  if (params.lastActionFrom) sp.set("last_action_from", params.lastActionFrom);
  if (params.lastActionTo) sp.set("last_action_to", params.lastActionTo);
  if (params.archived === "archived") sp.set("archived", "1");
  if (params.projectId) sp.set("project", params.projectId);
  if (params.assignedTo) sp.set("assigned", params.assignedTo);
  if (params.tags.length) sp.set("tag", params.tags.join(","));
  if (params.channel) sp.set("channel", params.channel);
  if (params.followUpPreset) sp.set("follow", params.followUpPreset);
  if (params.minValue) sp.set("min_value", params.minValue);
  if (params.maxValue) sp.set("max_value", params.maxValue);

  return sp;
}

export function buildProspectListPath(
  params: ProspectListParams,
  basePath: string = "/crm/prospects"
): string {
  const sp = buildProspectListSearchParams(params);
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function countActiveFilters(filters: ProspectListFilters): number {
  let n = 0;
  if (filters.sports.length) n++;
  if (filters.cantons.length) n++;
  if (filters.villes.length) n++;
  if (filters.statuses.length) n++;
  if (filters.hasEmail) n++;
  if (filters.hasPhone) n++;
  if (filters.nextFollowUpFrom || filters.nextFollowUpTo) n++;
  if (filters.lastActionFrom || filters.lastActionTo) n++;
  if (filters.archived === "archived") n++;
  if (filters.projectId) n++;
  if (filters.assignedTo) n++;
  if (filters.tags.length) n++;
  if (filters.channel) n++;
  if (filters.followUpPreset) n++;
  if (filters.minValue || filters.maxValue) n++;
  return n;
}

export function hasActiveSearchOrFilters(params: ProspectListParams): boolean {
  return Boolean(params.q) || countActiveFilters(params) > 0;
}

export function isDefaultSort(sort: string, order: "asc" | "desc"): boolean {
  return sort === DEFAULT_SORT_COLUMN && order === DEFAULT_SORT_ORDER;
}

export function cycleSortColumn(
  currentSort: string,
  currentOrder: "asc" | "desc",
  column: SortableColumn
): { sort: SortableColumn | typeof DEFAULT_SORT_COLUMN; order: "asc" | "desc" } {
  if (currentSort !== column) {
    return { sort: column, order: "asc" };
  }
  if (currentOrder === "asc") {
    return { sort: column, order: "desc" };
  }
  return { sort: DEFAULT_SORT_COLUMN, order: DEFAULT_SORT_ORDER };
}

/** Valide les statuts filtrés contre la liste connue. */
export function sanitizeStatuses(values: string[]): string[] {
  const allowed = new Set<string>(PROSPECT_STATUSES);
  return values.filter((v) => allowed.has(v));
}

export function normalizedQueryForApi(q: string): string {
  return normalizeSearchText(q);
}
