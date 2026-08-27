import { migrateProspectStatus } from "@/lib/crm/status";

/** Convertit une valeur absente ou vide en NULL (jamais de chaîne vide en base). */
export function nullIfEmpty(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export type ProspectInput = {
  club_name?: unknown;
  sport?: unknown;
  canton?: unknown;
  contact_name?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  notes?: unknown;
  project_id?: unknown;
  assigned_to?: unknown;
  potential_value?: unknown;
  contact_channel?: unknown;
  tags?: unknown;
  next_follow_up?: unknown;
  next_action?: unknown;
  ville?: unknown;
  logo_url?: unknown;
  address?: unknown;
  country?: unknown;
  linkedin_url?: unknown;
  source?: unknown;
  priority?: unknown;
};

/** Champs prospect normalisés pour insert/update Supabase. */
export function buildProspectFields(input: ProspectInput) {
  const club_name = nullIfEmpty(input.club_name);
  if (!club_name) {
    throw new Error("Nom du club requis");
  }

  const phone = nullIfEmpty(input.phone);

  let potential_value: number | null = null;
  if (input.potential_value != null && input.potential_value !== "") {
    const n = Number(input.potential_value);
    if (!Number.isNaN(n)) potential_value = n;
  }

  let tags: string[] = [];
  if (Array.isArray(input.tags)) {
    tags = input.tags.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof input.tags === "string" && input.tags.trim()) {
    tags = input.tags.split(",").map((t) => t.trim()).filter(Boolean);
  }

  return {
    club_name,
    name: club_name,
    sport: nullIfEmpty(input.sport),
    canton: nullIfEmpty(input.canton),
    contact_name: nullIfEmpty(input.contact_name),
    phone,
    phone_number: phone,
    email: nullIfEmpty(input.email),
    website: nullIfEmpty(input.website),
    notes: nullIfEmpty(input.notes),
    project_id: nullIfEmpty(input.project_id),
    assigned_to: nullIfEmpty(input.assigned_to),
    potential_value,
    contact_channel: nullIfEmpty(input.contact_channel),
    tags,
    next_follow_up: nullIfEmpty(input.next_follow_up),
    next_action: nullIfEmpty(input.next_action),
    ville: nullIfEmpty(input.ville),
    logo_url: nullIfEmpty(input.logo_url),
    address: nullIfEmpty(input.address),
    country: nullIfEmpty(input.country),
    linkedin_url: nullIfEmpty(input.linkedin_url),
    source: nullIfEmpty(input.source),
    priority: nullIfEmpty(input.priority) ?? "Normale",
  };
}

export function buildProspectInsertPayload(userId: string, input: ProspectInput) {
  return {
    ...buildProspectFields(input),
    user_id: userId,
    status: "À contacter" as const,
    next_action: "Premier contact",
    last_action: "Créé",
    last_action_at: new Date().toISOString(),
  };
}

export function buildProspectImportPayload(userId: string, input: ProspectInput) {
  return {
    ...buildProspectFields(input),
    user_id: userId,
    status: "À contacter" as const,
    next_action: "Premier contact",
    last_action: "Importé",
    last_action_at: new Date().toISOString(),
  };
}

/** Extrait le téléphone d'un enregistrement existant (phone ou phone_number). */
export function existingPhone(row: { phone?: string | null; phone_number?: string | null }): string | null {
  return nullIfEmpty(row.phone) ?? nullIfEmpty(row.phone_number);
}

/** Normalise un prospect lu depuis Supabase (phone_number → phone). */
export function normalizeProspectFromDb(row: Record<string, unknown>) {
  const phone = nullIfEmpty(row.phone) ?? nullIfEmpty(row.phone_number);
  const archived_at =
    row.archived_at == null || row.archived_at === ""
      ? null
      : String(row.archived_at);
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
  const potential_value =
    row.potential_value == null || row.potential_value === ""
      ? null
      : Number(row.potential_value);
  return {
    ...row,
    phone,
    archived_at,
    tags,
    potential_value,
    status: migrateProspectStatus(String(row.status ?? "À contacter")),
    next_action: row.next_action == null || row.next_action === "" ? null : String(row.next_action),
    closed_reason:
      row.closed_reason == null || row.closed_reason === "" ? null : String(row.closed_reason),
    closed_note: row.closed_note == null || row.closed_note === "" ? null : String(row.closed_note),
    legacy_status:
      row.legacy_status == null || row.legacy_status === "" ? null : String(row.legacy_status),
  };
}
