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
    phone,
    phone_number: phone,
    email: nullIfEmpty(input.email),
    website: nullIfEmpty(input.website),
    notes: nullIfEmpty(input.notes),
  };
}

export function buildProspectInsertPayload(userId: string, input: ProspectInput) {
  return {
    ...buildProspectFields(input),
    user_id: userId,
    status: "À contacter" as const,
    last_action: "Créé",
    last_action_at: new Date().toISOString(),
  };
}

export function buildProspectImportPayload(userId: string, input: ProspectInput) {
  return {
    ...buildProspectFields(input),
    user_id: userId,
    status: "À contacter" as const,
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
  return { ...row, phone, archived_at };
}
