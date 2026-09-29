import { PROSPECT_PRIORITIES, type ProspectPriority } from "@/lib/crm/prospect-fields";
import { migrateProspectStatus } from "@/lib/crm/status";
import { CONTACT_CHANNELS } from "@/lib/crm/types";

/** Convertit une valeur absente ou vide en NULL (jamais de chaîne vide en base). */
export function nullIfEmpty(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

/**
 * Note prospect : conserve paragraphes, sauts de ligne et caractères spéciaux.
 * Seuls les espaces en bordure sont retirés.
 */
export function normalizeNoteText(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  return s === "" ? null : s;
}

/**
 * `note` (création / import) et `notes` (champ déjà stocké) écrivent la même colonne.
 * Une valeur `note` non vide est prioritaire.
 */
export function resolveProspectNote(input: { note?: unknown; notes?: unknown }): string | null {
  return normalizeNoteText(input.note) ?? normalizeNoteText(input.notes);
}

function stripAccentsLower(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Parse un montant (12'000, CHF 2500, 12 000,50) vers un nombre. */
export function parsePotentialValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;

  let s = raw
    .replace(/\u00a0/g, " ")
    .replace(/(chf|eur|usd|frs|francs|€|\$)/gi, "")
    .replace(/['’]/g, "")
    .replace(/\s/g, "");

  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = `${parts[0]}.${parts[1]}`;
    } else {
      s = s.replace(/,/g, "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseProspectTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;|]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeProspectPriority(value: unknown): ProspectPriority {
  const raw = nullIfEmpty(value);
  if (!raw) return "Normale";
  if ((PROSPECT_PRIORITIES as readonly string[]).includes(raw)) {
    return raw as ProspectPriority;
  }
  const key = stripAccentsLower(raw);
  const aliases: Record<string, ProspectPriority> = {
    faible: "Faible",
    low: "Faible",
    bas: "Faible",
    normale: "Normale",
    normal: "Normale",
    medium: "Normale",
    moyenne: "Normale",
    haute: "Haute",
    high: "Haute",
    elevee: "Haute",
    urgente: "Urgente",
    urgent: "Urgente",
  };
  return aliases[key] ?? "Normale";
}

export function normalizeContactChannel(value: unknown): string | null {
  const raw = nullIfEmpty(value);
  if (!raw) return null;
  const key = stripAccentsLower(raw);
  const match = CONTACT_CHANNELS.find((channel) => stripAccentsLower(channel) === key);
  return match ?? raw;
}

export type ProspectInput = {
  club_name?: unknown;
  sport?: unknown;
  canton?: unknown;
  contact_name?: unknown;
  contact_function?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  /** Alias d'import / création. Écrit dans `notes`, pas une colonne séparée. */
  note?: unknown;
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

  return {
    club_name,
    name: club_name,
    sport: nullIfEmpty(input.sport),
    canton: nullIfEmpty(input.canton),
    contact_name: nullIfEmpty(input.contact_name),
    contact_function: nullIfEmpty(input.contact_function),
    phone,
    phone_number: phone,
    email: nullIfEmpty(input.email),
    website: nullIfEmpty(input.website),
    notes: resolveProspectNote(input),
    project_id: nullIfEmpty(input.project_id),
    assigned_to: nullIfEmpty(input.assigned_to),
    potential_value: parsePotentialValue(input.potential_value),
    contact_channel: normalizeContactChannel(input.contact_channel),
    tags: parseProspectTags(input.tags),
    next_follow_up: nullIfEmpty(input.next_follow_up),
    next_action: nullIfEmpty(input.next_action),
    ville: nullIfEmpty(input.ville),
    logo_url: nullIfEmpty(input.logo_url),
    address: nullIfEmpty(input.address),
    country: nullIfEmpty(input.country),
    linkedin_url: nullIfEmpty(input.linkedin_url),
    source: nullIfEmpty(input.source),
    priority: normalizeProspectPriority(input.priority),
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
