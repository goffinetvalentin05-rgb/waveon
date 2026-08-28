export type CsvProspectRow = {
  club_name: string;
  sport: string | null;
  canton: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

const HEADER_MAP: Record<string, keyof CsvProspectRow> = {
  club: "club_name",
  club_name: "club_name",
  "nom du club": "club_name",
  nom: "club_name",
  sport: "sport",
  canton: "canton",
  contact: "contact_name",
  contact_name: "contact_name",
  "nom du contact": "contact_name",
  telephone: "phone",
  téléphone: "phone",
  phone: "phone",
  tel: "phone",
  email: "email",
  mail: "email",
  "site web": "website",
  site: "website",
  website: "website",
  url: "website",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/"/g, "");
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," || ch === ";") && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** Parse un CSV entreprise/secteur/région/contact/téléphone/email/site web. */
export function parseProspectsCsv(text: string): {
  rows: CsvProspectRow[];
  errors: string[];
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ["Le fichier CSV est vide ou sans données."] };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const mapped = headers.map((h) => HEADER_MAP[h] ?? null);

  if (!mapped.includes("club_name")) {
    return {
      rows: [],
      errors: ['Colonne "Nom" ou "Entreprise" (club_name) obligatoire manquante.'],
    };
  }

  const rows: CsvProspectRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: CsvProspectRow = {
      club_name: "",
      sport: null,
      canton: null,
      contact_name: null,
      phone: null,
      email: null,
      website: null,
    };

    mapped.forEach((key, idx) => {
      if (!key) return;
      const value = (cells[idx] ?? "").replace(/^"|"$/g, "").trim();
      if (!value) return;
      if (key === "club_name") row.club_name = value;
      else row[key] = value;
    });

    if (!row.club_name) {
      errors.push(`Ligne ${i + 1} : nom / entreprise manquant.`);
      continue;
    }
    rows.push(row);
  }

  return { rows, errors };
}
