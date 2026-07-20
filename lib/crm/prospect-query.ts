import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SORT_COLUMN,
  type ProspectListParams,
  sanitizeStatuses,
} from "@/lib/crm/prospect-list-params";
import { extractPhoneDigits, normalizeSearchText } from "@/lib/crm/search";

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
  let query = supabase.from("prospects").select("*", { count: "exact" }).eq("user_id", userId);

  if (params.clientsOnly) {
    query = query.eq("status", "Client");
  } else if (params.statuses.length) {
    query = query.in("status", sanitizeStatuses(params.statuses));
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

    if (params.clientsOnly) {
      legacyQuery = legacyQuery.eq("status", "Client");
    } else if (params.statuses.length) {
      legacyQuery = legacyQuery.in("status", sanitizeStatuses(params.statuses));
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
    .select("sport, canton, ville, status")
    .eq("user_id", userId);

  if (clientsOnly) {
    query = query.eq("status", "Client");
  }

  const { data, error } = await query.limit(5000);
  if (error) throw error;

  const sports = new Set<string>();
  const cantons = new Set<string>();
  const villes = new Set<string>();
  const statuses = new Set<string>();

  for (const row of data ?? []) {
    if (row.sport) sports.add(row.sport);
    if (row.canton) cantons.add(row.canton);
    if (row.ville) villes.add(row.ville);
    if (row.status) statuses.add(row.status);
  }

  const sortAlpha = (a: string, b: string) => a.localeCompare(b, "fr");

  return {
    sports: [...sports].sort(sortAlpha),
    cantons: [...cantons].sort(sortAlpha),
    villes: [...villes].sort(sortAlpha),
    statuses: [...statuses].sort(sortAlpha),
  };
}
