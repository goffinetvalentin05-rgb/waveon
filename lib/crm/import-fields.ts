/** Champs CRM disponibles pour l'import. */
export const IMPORT_FIELDS = [
  { key: "club_name", label: "Nom / entreprise", required: true },
  { key: "sport", label: "Secteur", required: false },
  { key: "canton", label: "Région", required: false },
  { key: "contact_name", label: "Nom du contact", required: false },
  { key: "phone", label: "Téléphone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "website", label: "Site web", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export type ImportProspectRow = {
  club_name: string;
  sport: string | null;
  canton: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
};

export type DuplicateStrategy = "ignore" | "import_anyway" | "update";

export type ParsedImportFile = {
  fileName: string;
  columns: string[];
  rows: string[][];
  totalRows: number;
};

export type ColumnMapping = Record<string, ImportFieldKey | "">;

/** Alias pour l'association automatique des colonnes. */
const COLUMN_ALIASES: Record<ImportFieldKey, string[]> = {
  club_name: [
    "club",
    "nom",
    "nom du club",
    "club_name",
    "organisation",
    "organization",
    "structure",
    "établissement",
    "etablissement",
  ],
  sport: ["sport", "discipline", "catégorie", "categorie", "activité", "activite"],
  canton: ["canton", "région", "region", "département", "departement", "ville"],
  contact_name: [
    "contact",
    "nom du contact",
    "contact_name",
    "responsable",
    "président",
    "president",
    "referent",
    "référent",
    "referent",
    "interlocuteur",
  ],
  phone: [
    "téléphone",
    "telephone",
    "tel",
    "phone",
    "mobile",
    "numéro",
    "numero",
    "gsm",
    "portable",
  ],
  email: ["email", "mail", "e-mail", "courriel", "adresse email", "adresse mail"],
  website: ["site", "site web", "website", "url", "web", "lien"],
  notes: ["notes", "note", "commentaire", "commentaires", "remarque", "remarques", "observations"],
};

function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/"/g, "");
}

/** Associe automatiquement les colonnes du fichier aux champs CRM. */
export function autoMapColumns(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedFields = new Set<ImportFieldKey>();

  for (const col of columns) {
    const normalized = normalizeColumnName(col);
    let matched: ImportFieldKey | null = null;

    for (const field of IMPORT_FIELDS) {
      if (usedFields.has(field.key)) continue;
      const aliases = COLUMN_ALIASES[field.key];
      if (aliases.some((a) => normalized === normalizeColumnName(a))) {
        matched = field.key;
        break;
      }
    }

    // Correspondance partielle si pas de match exact
    if (!matched) {
      for (const field of IMPORT_FIELDS) {
        if (usedFields.has(field.key)) continue;
        const aliases = COLUMN_ALIASES[field.key];
        if (aliases.some((a) => normalized.includes(normalizeColumnName(a)))) {
          matched = field.key;
          break;
        }
      }
    }

    mapping[col] = matched ?? "";
    if (matched) usedFields.add(matched);
  }

  return mapping;
}

export function cellValue(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim();
}

/** Applique le mapping colonnes → champs CRM sur une ligne brute. */
export function mapRowToProspect(
  columns: string[],
  row: string[],
  mapping: ColumnMapping
): ImportProspectRow | null {
  const result: ImportProspectRow = {
    club_name: "",
    sport: null,
    canton: null,
    contact_name: null,
    phone: null,
    email: null,
    website: null,
    notes: null,
  };

  columns.forEach((col, idx) => {
    const field = mapping[col];
    if (!field) return;
    const value = cellValue(row[idx]);
    if (!value) return;
    if (field === "club_name") result.club_name = value;
    else result[field] = value;
  });

  if (!result.club_name.trim()) return null;
  return result;
}

export function normalizeEmail(email: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function normalizePhone(phone: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function normalizeClubName(name: string): string {
  return name.trim().toLowerCase();
}
