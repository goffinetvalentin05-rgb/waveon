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

function splitCsvLine(line: string, separator: string): string[] {
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
    } else if (ch === separator && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells.map((c) => c.replace(/^"|"$/g, "").trim());
}

function detectSeparator(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function isRowEmpty(row: string[]): boolean {
  return row.every((c) => !cellValue(c));
}

/** Parse un fichier CSV (UTF-8, virgule ou point-virgule). */
export function parseCsvFile(text: string): ParsedImportFile {
  const cleaned = stripBom(text);
  const rawLines = cleaned.split(/\r?\n/);
  const nonEmptyLines = rawLines.filter((l) => l.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    throw new Error("Le fichier est vide.");
  }

  const separator = detectSeparator(nonEmptyLines[0]);
  const headers = splitCsvLine(nonEmptyLines[0], separator);

  if (headers.every((h) => !h)) {
    throw new Error("Aucune colonne détectée dans le fichier.");
  }

  const rows: string[][] = [];
  for (let i = 1; i < nonEmptyLines.length; i++) {
    const cells = splitCsvLine(nonEmptyLines[i], separator);
    // Aligner le nombre de colonnes
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
