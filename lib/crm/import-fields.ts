/** Champs CRM disponibles pour l'import — alignés sur le modèle Prospect. */
export const IMPORT_FIELDS = [
  { key: "club_name", label: "Nom / entreprise", required: true },
  { key: "sport", label: "Secteur", required: false },
  { key: "canton", label: "Région", required: false },
  { key: "ville", label: "Ville", required: false },
  { key: "country", label: "Pays", required: false },
  { key: "address", label: "Adresse", required: false },
  { key: "contact_name", label: "Nom du contact", required: false },
  { key: "contact_function", label: "Fonction du contact", required: false },
  { key: "phone", label: "Téléphone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "website", label: "Site web", required: false },
  { key: "linkedin_url", label: "LinkedIn", required: false },
  { key: "source", label: "Source", required: false },
  { key: "contact_channel", label: "Canal", required: false },
  { key: "priority", label: "Priorité", required: false },
  { key: "potential_value", label: "Valeur potentielle (CHF)", required: false },
  { key: "tags", label: "Tags", required: false },
  { key: "notes", label: "Note", required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export type ImportProspectRow = {
  club_name: string;
  sport: string | null;
  canton: string | null;
  ville: string | null;
  country: string | null;
  address: string | null;
  contact_name: string | null;
  contact_function: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  linkedin_url: string | null;
  source: string | null;
  contact_channel: string | null;
  priority: string | null;
  potential_value: string | null;
  tags: string | null;
  notes: string | null;
  /** Alias JSON (`note`). Fusionné dans `notes` à l'enregistrement. */
  note?: string | null;
};

export type DuplicateStrategy = "ignore" | "import_anyway" | "update";

export type ParsedImportFile = {
  fileName: string;
  columns: string[];
  rows: string[][];
  totalRows: number;
};

export type ColumnMapping = Record<string, ImportFieldKey | "">;

const EMPTY_IMPORT_ROW: Omit<ImportProspectRow, "club_name" | "note"> & { club_name: string } = {
  club_name: "",
  sport: null,
  canton: null,
  ville: null,
  country: null,
  address: null,
  contact_name: null,
  contact_function: null,
  phone: null,
  email: null,
  website: null,
  linkedin_url: null,
  source: null,
  contact_channel: null,
  priority: null,
  potential_value: null,
  tags: null,
  notes: null,
};

/** Alias pour l'association automatique des colonnes (en plus du libellé du champ). */
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
    "entreprise",
    "société",
    "societe",
    "company",
  ],
  sport: ["sport", "discipline", "catégorie", "categorie", "activité", "activite", "secteur"],
  canton: ["canton", "région", "region", "département", "departement"],
  ville: ["ville", "city", "localité", "localite", "commune"],
  country: ["pays", "country", "nation"],
  address: ["adresse", "address", "rue", "street"],
  contact_name: [
    "contact",
    "nom du contact",
    "contact_name",
    "responsable",
    "président",
    "president",
    "referent",
    "référent",
    "interlocuteur",
  ],
  contact_function: [
    "fonction",
    "fonction du contact",
    "poste",
    "titre",
    "job title",
    "role",
    "rôle",
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
  website: ["site", "site web", "website", "url", "web"],
  linkedin_url: [
    "linkedin",
    "linked in",
    "linkedin url",
    "profil linkedin",
    "lien linkedin",
    "linkedin_url",
  ],
  source: ["source", "provenance", "origine"],
  contact_channel: ["canal", "channel", "canal de contact", "canal contact"],
  priority: ["priorité", "priorite", "priority", "urgence"],
  potential_value: [
    "valeur",
    "valeur potentielle",
    "valeur potentielle chf",
    "ca potentiel",
    "montant",
    "potential value",
    "potential_value",
  ],
  tags: ["tags", "tag", "étiquettes", "etiquettes", "labels"],
  notes: ["notes", "note", "commentaire", "commentaires", "remarque", "remarques", "observations"],
};

const STOP_WORDS = new Set([
  "du",
  "de",
  "des",
  "la",
  "le",
  "les",
  "et",
  "the",
  "of",
  "a",
  "un",
  "une",
  "d",
  "chf",
  "eur",
  "usd",
  "frs",
  "francs",
]);

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeColumnName(name: string): string {
  return stripAccents(name.trim().toLowerCase()).replace(/"/g, "");
}

function stripParentheses(name: string): string {
  return name.replace(/\([^)]*\)/g, " ");
}

function tokens(name: string): string[] {
  return normalizeColumnName(stripParentheses(name))
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normKey(name: string): string {
  return tokens(name).join(" ");
}

function significantTokens(name: string): string[] {
  return tokens(name).filter((t) => !STOP_WORDS.has(t) && t.length > 1);
}

function scoreColumnToField(column: string, field: (typeof IMPORT_FIELDS)[number]): number {
  const colKey = normKey(column);
  const colNoParen = normKey(stripParentheses(column));
  const labelKey = normKey(field.label);
  const labelNoParen = normKey(stripParentheses(field.label));

  if (
    colKey === labelKey ||
    colNoParen === labelKey ||
    colKey === labelNoParen ||
    colNoParen === labelNoParen
  ) {
    return 2000 + labelKey.length;
  }

  const keyAsWords = field.key.replace(/_/g, " ");
  if (colKey === keyAsWords || colNoParen === keyAsWords) {
    return 1800;
  }

  let bestAlias = 0;
  for (const alias of COLUMN_ALIASES[field.key]) {
    const aliasKey = normKey(alias);
    if (!aliasKey) continue;
    if (colKey === aliasKey || colNoParen === aliasKey) {
      bestAlias = Math.max(bestAlias, 1000 + aliasKey.length);
    }
  }
  if (bestAlias) return bestAlias;

  const colTok = significantTokens(column);
  const labelTok = significantTokens(field.label);
  if (!colTok.length || !labelTok.length) return 0;

  const labelSet = new Set(labelTok);
  const colSet = new Set(colTok);
  const intersection = colTok.filter((t) => labelSet.has(t)).length;
  const colInLabel = colTok.every((t) => labelSet.has(t));
  const labelInCol = labelTok.every((t) => colSet.has(t));

  if (labelInCol || (colInLabel && colTok.length >= 2)) {
    return 700 + intersection * 20 + Math.min(colTok.length, labelTok.length);
  }

  if (colTok.length === 1 && labelSet.has(colTok[0]) && colTok[0].length >= 5) {
    return 600 + colTok[0].length;
  }

  return 0;
}

/** Associe automatiquement les colonnes du fichier aux champs CRM. */
export function autoMapColumns(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const col of columns) mapping[col] = "";

  const scored: { col: string; field: ImportFieldKey; score: number; fieldIndex: number }[] = [];
  columns.forEach((col) => {
    IMPORT_FIELDS.forEach((field, fieldIndex) => {
      const score = scoreColumnToField(col, field);
      if (score > 0) scored.push({ col, field: field.key, score, fieldIndex });
    });
  });

  scored.sort((a, b) => b.score - a.score || a.fieldIndex - b.fieldIndex);

  const usedFields = new Set<ImportFieldKey>();
  const usedCols = new Set<string>();
  for (const { col, field } of scored) {
    if (usedCols.has(col) || usedFields.has(field)) continue;
    mapping[col] = field;
    usedCols.add(col);
    usedFields.add(field);
  }

  return mapping;
}

export function cellValue(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

/** Applique le mapping colonnes → champs CRM sur une ligne brute. */
export function mapRowToProspect(
  columns: string[],
  row: string[],
  mapping: ColumnMapping
): ImportProspectRow | null {
  const result: ImportProspectRow = { ...EMPTY_IMPORT_ROW };

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
