import * as XLSX from "xlsx";
import type { ParsedImportFile } from "./import-fields";
import { cellValue } from "./import-fields";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const ACCEPTED_MIMES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/csv",
  "text/plain",
]);

export function isAcceptedImportFile(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (ACCEPTED_EXTENSIONS.includes(ext)) return true;
  return ACCEPTED_MIMES.has(file.type);
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function detectSeparator(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

/** Première ligne d'en-tête, sans couper un champ entre guillemets. */
function headerRecord(text: string): string {
  let inQuotes = false;
  let header = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        header += ch;
        i++;
        header += text[i];
        continue;
      }
      inQuotes = !inQuotes;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    header += ch;
  }
  return header;
}

/**
 * Découpe RFC 4180 : les sauts de ligne à l'intérieur de guillemets
 * restent dans la cellule (mails de prospection, paragraphes).
 */
function parseCsvRecords(text: string, separator: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(cellValue(field));
    field = "";
  };

  const pushRow = () => {
    pushField();
    if (!isRowEmpty(row)) records.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (ch === "\r") {
        field += "\n";
        if (text[i + 1] === "\n") i++;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === separator) {
      pushField();
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushRow();
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) pushRow();
  return records;
}

function isRowEmpty(row: string[]): boolean {
  return row.every((c) => !cellValue(c));
}

/** Parse un fichier CSV (UTF-8, virgule ou point-virgule, champs multilignes). */
export function parseCsvFile(text: string): ParsedImportFile {
  const cleaned = stripBom(text);
  if (!cleaned.trim()) {
    throw new Error("Le fichier est vide.");
  }

  const separator = detectSeparator(headerRecord(cleaned));
  const records = parseCsvRecords(cleaned, separator);
  const headers = records[0] ?? [];

  if (headers.length === 0 || headers.every((h) => !h)) {
    throw new Error("Aucune colonne détectée dans le fichier.");
  }

  const rows: string[][] = [];
  for (let i = 1; i < records.length; i++) {
    const cells = records[i].slice();
    while (cells.length < headers.length) cells.push("");
    const row = cells.slice(0, headers.length);
    if (!isRowEmpty(row)) rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("Aucune ligne de données trouvée dans le fichier.");
  }

  return {
    fileName: "",
    columns: headers,
    rows,
    totalRows: rows.length,
  };
}

/** Parse un fichier Excel (.xlsx / .xls) — première feuille. */
export function parseExcelBuffer(buffer: ArrayBuffer, fileName: string): ParsedImportFile {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Le classeur Excel ne contient aucune feuille.");
  }

  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!raw.length) {
    throw new Error("La feuille Excel est vide.");
  }

  const headerRow = raw[0].map((c) => cellValue(c));
  if (headerRow.every((h) => !h)) {
    throw new Error("Aucune colonne détectée dans le fichier Excel.");
  }

  const rows: string[][] = [];
  for (let i = 1; i < raw.length; i++) {
    const line = raw[i].map((c) => cellValue(c));
    while (line.length < headerRow.length) line.push("");
    const row = line.slice(0, headerRow.length);
    if (!isRowEmpty(row)) rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("Aucune ligne de données trouvée dans la feuille Excel.");
  }

  return {
    fileName,
    columns: headerRow,
    rows,
    totalRows: rows.length,
  };
}

/** Point d'entrée : parse CSV ou Excel selon l'extension. */
export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  if (!isAcceptedImportFile(file)) {
    throw new Error("Format non pris en charge. Utilisez .csv, .xlsx ou .xls.");
  }

  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

  if (ext === ".csv") {
    const text = await file.text();
    const parsed = parseCsvFile(text);
    return { ...parsed, fileName: file.name };
  }

  if (ext === ".xlsx" || ext === ".xls") {
    const buffer = await file.arrayBuffer();
    return parseExcelBuffer(buffer, file.name);
  }

  throw new Error("Format non pris en charge.");
}
