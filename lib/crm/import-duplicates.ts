import type { DuplicateStrategy, ImportProspectRow } from "./import-fields";
import {
  normalizeClubName,
  normalizeEmail,
  normalizePhone,
} from "./import-fields";
import { existingPhone } from "./prospect-payload";

export type ExistingProspectKeys = {
  id: string;
  club_name: string;
  email: string | null;
  phone?: string | null;
  phone_number?: string | null;
};

export type DuplicateMatch = {
  rowIndex: number;
  existingId: string;
  matchedBy: "email" | "club_name" | "phone";
  club_name: string;
};

export type ImportPlanRow = {
  row: ImportProspectRow;
  rowIndex: number;
  action: "create" | "update" | "skip";
  existingId?: string;
  duplicateReason?: string;
};

/** Trouve un prospect existant correspondant (email > club > téléphone). */
export function findExistingMatch(
  row: ImportProspectRow,
  existing: ExistingProspectKeys[]
): { id: string; matchedBy: "email" | "club_name" | "phone" } | null {
  const email = normalizeEmail(row.email);
  const phone = normalizePhone(row.phone);
  const club = normalizeClubName(row.club_name);

  if (email) {
    const match = existing.find((e) => normalizeEmail(e.email) === email);
    if (match) return { id: match.id, matchedBy: "email" };
  }

  if (club) {
    const match = existing.find((e) => normalizeClubName(e.club_name) === club);
    if (match) return { id: match.id, matchedBy: "club_name" };
  }

  if (phone.length >= 6) {
    const match = existing.find((e) => normalizePhone(existingPhone(e)) === phone);
    if (match) return { id: match.id, matchedBy: "phone" };
  }

  return null;
}

/** Construit le plan d'import avec gestion des doublons. */
export function buildImportPlan(
  rows: ImportProspectRow[],
  existing: ExistingProspectKeys[],
  strategy: DuplicateStrategy
): { plan: ImportPlanRow[]; invalidRows: number[] } {
  const invalidRows: number[] = [];
  const plan: ImportPlanRow[] = [];
  const seenInFile = {
    emails: new Map<string, number>(),
    clubs: new Map<string, number>(),
    phones: new Map<string, number>(),
  };

  rows.forEach((row, rowIndex) => {
    if (!row.club_name.trim()) {
      invalidRows.push(rowIndex);
      return;
    }

    const email = normalizeEmail(row.email);
    const phone = normalizePhone(row.phone);
    const club = normalizeClubName(row.club_name);

    // Doublon dans le fichier
    let fileDuplicate = false;
    if (email && seenInFile.emails.has(email)) fileDuplicate = true;
    if (club && seenInFile.clubs.has(club)) fileDuplicate = true;
    if (phone.length >= 6 && seenInFile.phones.has(phone)) fileDuplicate = true;

    if (email) seenInFile.emails.set(email, rowIndex);
    if (club) seenInFile.clubs.set(club, rowIndex);
    if (phone.length >= 6) seenInFile.phones.set(phone, rowIndex);

    const existingMatch = findExistingMatch(row, existing);

    if (fileDuplicate && strategy === "ignore") {
      plan.push({
        row,
        rowIndex,
        action: "skip",
        duplicateReason: "Doublon dans le fichier",
      });
      return;
    }

    if (existingMatch) {
      if (strategy === "ignore") {
        plan.push({
          row,
          rowIndex,
          action: "skip",
          existingId: existingMatch.id,
          duplicateReason: `Doublon (${existingMatch.matchedBy})`,
        });
        return;
      }
      if (strategy === "update") {
        plan.push({
          row,
          rowIndex,
          action: "update",
          existingId: existingMatch.id,
          duplicateReason: `Mise à jour (${existingMatch.matchedBy})`,
        });
        return;
      }
      // import_anyway
    }

    plan.push({ row, rowIndex, action: "create" });
  });

  return { plan, invalidRows };
}

export function countImportActions(plan: ImportPlanRow[]) {
  return {
    create: plan.filter((p) => p.action === "create").length,
    update: plan.filter((p) => p.action === "update").length,
    skip: plan.filter((p) => p.action === "skip").length,
    total: plan.filter((p) => p.action !== "skip").length,
  };
}
