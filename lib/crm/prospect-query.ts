import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SORT_COLUMN,
  type ProspectListParams,
  sanitizeStatuses,
} from "@/lib/crm/prospect-list-params";
import { extractPhoneDigits, normalizeSearchText } from "@/lib/crm/search";
import { CLOSED_STATUS_POSTGREST } from "@/lib/crm/closed";
import { SMART_VIEW_STATUSES } from "@/lib/crm/smart-views";
import { expandStatusesForQuery } from "@/lib/crm/status";

const ALLOWED_SORT = new Set([
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
  "updated_at",
  "created_at",
  "potential_value",
  "next_action",
]);

export type ProspectQueryResult = {
  data: Record<string, unknown>[] | null;
  count: number | null;
  error: { message: string } | null;
};

/** Applique recherche, filtres et tri sur une requête prospects (sans pagination). */
export function applyProspectListQuery(
  supabase: SupabaseClient,
  userId: string,
  params: ProspectListParams
) {
  let query = supabase.from("prospects").select("*", { count: "exact" });

  if (params.projectId && params.projectId !== "unassigned") {
    query = query.eq("project_id", params.projectId);
  } else {
    query = query.eq("user_id", userId);
  }

  if (params.archived === "archived") {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  const today = new Date().toISOString().slice(0, 10);
  const smart = params.smartView && params.smartView !== "all" ? params.smartView : null;

  if (params.clientsOnly) {
    query = query.eq("status", "Client");
  } else {
    if (smart === "today_work") {
      query = query.lte("next_follow_up", today).not("status", "in", CLOSED_STATUS_POSTGREST);
    } else if (smart === "overdue") {
      query = query.lt("next_follow_up", today).not("status", "in", CLOSED_STATUS_POSTGREST);
    } else if (smart && SMART_VIEW_STATUSES[smart]) {
      query = query.in("status", expandStatusesForQuery(SMART_VIEW_STATUSES[smart]!));
    } else if (params.statuses.length) {
      query = query.in("status", expandStatusesForQuery(sanitizeStatuses(params.statuses)));
    }
    query = query.neq("status", "Client");
  }

  if (params.sports.length) query = query.in("sport", params.sports);
  if (params.cantons.length) query = query.in("canton", params.cantons);
  if (params.villes.length) query = query.in("ville", params.villes);

  if (params.hasEmail === "yes") {
    query = query.not("email", "is", null).neq("email", "");
  } else if (params.hasEmail === "no") {
    query = query.or("email.is.null,email.eq.");
  }

  if (params.hasPhone === "yes") {
    query = query.not("phone", "is", null).neq("phone", "");
  } else if (params.hasPhone === "no") {
    query = query.or("phone.is.null,phone.eq.");
  }

  if (params.nextFollowUpFrom) {
    query = query.gte("next_follow_up", params.nextFollowUpFrom);
  }
  if (params.nextFollowUpTo) {
    query = query.lte("next_follow_up", params.nextFollowUpTo);
  }
  if (params.lastActionFrom) {
    query = query.gte("last_action_at", `${params.lastActionFrom}T00:00:00`);
  }
  if (params.lastActionTo) {
    query = query.lte("last_action_at", `${params.lastActionTo}T23:59:59`);
  }

  if (params.projectId === "unassigned") {
    query = query.is("project_id", null);
  } else if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }
  if (params.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }
  if (params.channel) {
    query = query.eq("contact_channel", params.channel);
  }
  if (params.tags.length) {
    query = query.overlaps("tags", params.tags);
  }
  if (params.minValue) {
    query = query.gte("potential_value", Number(params.minValue));
  }
  if (params.maxValue) {
    query = query.lte("potential_value", Number(params.maxValue));
  }

  if (!smart) {
    if (params.followUpPreset === "today") {
      query = query.eq("next_follow_up", today);
    } else if (params.followUpPreset === "overdue") {
      query = query.lt("next_follow_up", today);
    }
  }

  const q = params.q.trim();
  if (q) {
    const normalized = normalizeSearchText(q);
    const digits = extractPhoneDigits(q);

    if (digits.length >= 3) {
      query = query.or(
        [
          normalized ? `search_text.ilike.%${escapeIlike(normalized)}%` : null,
          `phone_digits.ilike.%${escapeIlike(digits)}%`,
        ]
          .filter(Boolean)
          .join(",")
      );
    } else if (normalized) {
      query = query.ilike("search_text", `%${escapeIlike(normalized)}%`);
    }
  }

  const sortCol = ALLOWED_SORT.has(params.sort) ? params.sort : DEFAULT_SORT_COLUMN;
  query = query.order(sortCol, { ascending: params.order === "asc", nullsFirst: false });

  return query;
}

function applyLegacyTextSearch(
  query: ReturnType<ReturnType<SupabaseClient["from"]>["select"]>,
  q: string
) {
  const normalized = normalizeSearchText(q);
  const digits = extractPhoneDigits(q);
  const terms = [q.trim(), normalized].filter((v, i, a) => v && a.indexOf(v) === i);

  const fields = [
    "club_name",
    "sport",
    "canton",
    "ville",
    "contact_name",
    "contact_function",
    "email",
    "website",
    "status",
    "notes",
    "phone",
  ];

  const parts: string[] = [];
  for (const term of terms) {
    const escaped = escapeIlike(term);
    for (const field of fields) {
      parts.push(`${field}.ilike.%${escaped}%`);
    }
  }

  if (digits.length >= 3) {
    for (let i = 0; i <= digits.length - 3; i++) {
      const chunk = escapeIlike(digits.slice(i, i + Math.min(4, digits.length - i)));
      parts.push(`phone.ilike.%${chunk}%`);
    }
  }

  return query.or(parts.join(","));
}

function isMissingSearchColumnError(error: { message: string } | null): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("search_text") || msg.includes("phone_digits");
}

export async function fetchProspectList(
  supabase: SupabaseClient,
  userId: string,
  params: ProspectListParams
): Promise<ProspectQueryResult> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  const query = applyProspectListQuery(supabase, userId, params);
  const firstAttempt = await query.range(from, to);
  let { data, error, count } = firstAttempt;

  if (error && isMissingSearchColumnError(error) && params.q.trim()) {
    let legacyQuery = supabase.from("prospects").select("*", { count: "exact" }).eq("user_id", userId);

    if (params.archived === "archived") {
      legacyQuery = legacyQuery.not("archived_at", "is", null);
    } else {
      legacyQuery = legacyQuery.is("archived_at", null);
    }

    if (params.clientsOnly) {
      legacyQuery = legacyQuery.eq("status", "Client");
    } else {
      if (params.statuses.length) {
        legacyQuery = legacyQuery.in("status", expandStatusesForQuery(sanitizeStatuses(params.statuses)));
      }
      legacyQuery = legacyQuery.neq("status", "Client");
    }

    if (params.sports.length) legacyQuery = legacyQuery.in("sport", params.sports);
    if (params.cantons.length) legacyQuery = legacyQuery.in("canton", params.cantons);
    if (params.villes.length) legacyQuery = legacyQuery.in("ville", params.villes);

    if (params.hasEmail === "yes") {
      legacyQuery = legacyQuery.not("email", "is", null).neq("email", "");
    } else if (params.hasEmail === "no") {
      legacyQuery = legacyQuery.or("email.is.null,email.eq.");
    }

    if (params.hasPhone === "yes") {
      legacyQuery = legacyQuery.not("phone", "is", null).neq("phone", "");
    } else if (params.hasPhone === "no") {
      legacyQuery = legacyQuery.or("phone.is.null,phone.eq.");
    }

    if (params.nextFollowUpFrom) legacyQuery = legacyQuery.gte("next_follow_up", params.nextFollowUpFrom);
    if (params.nextFollowUpTo) legacyQuery = legacyQuery.lte("next_follow_up", params.nextFollowUpTo);
    if (params.lastActionFrom) {
      legacyQuery = legacyQuery.gte("last_action_at", `${params.lastActionFrom}T00:00:00`);
    }
    if (params.lastActionTo) {
      legacyQuery = legacyQuery.lte("last_action_at", `${params.lastActionTo}T23:59:59`);
    }
    if (params.projectId) legacyQuery = legacyQuery.eq("project_id", params.projectId);
    if (params.assignedTo) legacyQuery = legacyQuery.eq("assigned_to", params.assignedTo);
    if (params.channel) legacyQuery = legacyQuery.eq("contact_channel", params.channel);

    legacyQuery = applyLegacyTextSearch(legacyQuery, params.q.trim());

    const sortCol = ALLOWED_SORT.has(params.sort) ? params.sort : DEFAULT_SORT_COLUMN;
    legacyQuery = legacyQuery.order(sortCol, {
      ascending: params.order === "asc",
      nullsFirst: false,
    });

    ({ data, error, count } = await legacyQuery.range(from, to));
  }

  return { data, count, error };
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function fetchProspectFilterOptions(
  supabase: SupabaseClient,
  userId: string,
  clientsOnly: boolean
) {
  let query = supabase
    .from("prospects")
    .select("sport, canton, ville, status, tags, contact_channel")
    .eq("user_id", userId)
    .is("archived_at", null);

  if (clientsOnly) {
    query = query.eq("status", "Client");
  } else {
    query = query.neq("status", "Client");
  }

  const { data, error } = await query.limit(5000);
  if (error) throw error;

  const sports = new Set<string>();
  const cantons = new Set<string>();
  const villes = new Set<string>();
  const statuses = new Set<string>();
  const tags = new Set<string>();
  const channels = new Set<string>();

  for (const row of data ?? []) {
    if (row.sport) sports.add(row.sport);
    if (row.canton) cantons.add(row.canton);
    if (row.ville) villes.add(row.ville);
    if (row.status) statuses.add(row.status);
    if (Array.isArray(row.tags)) {
      for (const t of row.tags) if (t) tags.add(String(t));
    }
    if (row.contact_channel) channels.add(row.contact_channel);
  }

  const sortAlpha = (a: string, b: string) => a.localeCompare(b, "fr");

  return {
    sports: [...sports].sort(sortAlpha),
    cantons: [...cantons].sort(sortAlpha),
    villes: [...villes].sort(sortAlpha),
    statuses: [...statuses].sort(sortAlpha),
    tags: [...tags].sort(sortAlpha),
    channels: [...channels].sort(sortAlpha),
  };
}
