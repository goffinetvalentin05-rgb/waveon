/**
 * Note à la création / à l'import : même champ prospects.notes, sauts de ligne conservés.
 * Exécution : npx tsx lib/crm/import-note.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { autoMapColumns, mapRowToProspect } from "./import-fields";
import { parseCsvFile, parseExcelBuffer } from "./import-parse";
import { buildProspectImportPayload, buildProspectInsertPayload } from "./prospect-payload";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`KO  ${name}`);
    console.error(error);
  }
}

const MAIL = [
  "Objet : Une idée pour L’Atelier & Cie",
  "",
  "Email :",
  "",
  "Bonjour Prénom,",
  "",
  "Proposition à 1 200 € — « priorité » été.",
  "Ligne avec ; virgule, et guillemets \"ici\".",
].join("\n");

test("CSV simple sans note", () => {
  const parsed = parseCsvFile("Club,Email\nFC Alle,info@fcalle.ch\n");
  assert.deepEqual(parsed.columns, ["Club", "Email"]);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0][0], "FC Alle");
});

test("CSV multiligne : paragraphes, ponctuation et séparateurs dans la note", () => {
  const csv = [
    "Club,Email,note",
    `"Société, SA",contact@exemple.ch,"${MAIL.replace(/"/g, '""')}"`,
    "Autre club,autre@exemple.ch,",
  ].join("\n");

  const parsed = parseCsvFile(csv);
  assert.equal(parsed.rows.length, 2);
  assert.deepEqual(parsed.columns, ["Club", "Email", "note"]);
  assert.equal(parsed.rows[0][0], "Société, SA");
  assert.equal(parsed.rows[0][2], MAIL);
  assert.equal(parsed.rows[1][0], "Autre club");
  assert.equal(parsed.rows[1][2], "");

  const mapping = autoMapColumns(parsed.columns);
  assert.equal(mapping.note, "notes");
  const withNote = mapRowToProspect(parsed.columns, parsed.rows[0], mapping);
  const withoutNote = mapRowToProspect(parsed.columns, parsed.rows[1], mapping);
  assert.equal(withNote?.notes, MAIL);
  assert.equal(withoutNote?.club_name, "Autre club");
  assert.equal(withoutNote?.notes, null);
});

test("CSV point-virgule et retours CRLF dans la note", () => {
  const csv = "Club;note\r\nFC Test;\"Ligne 1\r\n\r\nLigne 2 — été\"\r\n";
  const parsed = parseCsvFile(csv);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0][1], "Ligne 1\n\nLigne 2 — été");
});

test("fichier d'exemple : la note du premier prospect reste un mail", () => {
  const text = readFileSync(new URL("../../public/exemple-import-prospects.csv", import.meta.url), "utf8");
  const parsed = parseCsvFile(text);
  assert.equal(parsed.rows.length, 3);
  const mapping = autoMapColumns(parsed.columns);
  assert.equal(mapping.note, "notes");
  const first = mapRowToProspect(parsed.columns, parsed.rows[0], mapping);
  assert.equal(first?.club_name, "FC Delémont");
  assert.match(first?.notes ?? "", /Objet : Une idée pour FC Delémont/);
  assert.match(first?.notes ?? "", /\n\nEmail :\n\nBonjour Jean,/);
  const empty = mapRowToProspect(parsed.columns, parsed.rows[2], mapping);
  assert.equal(empty?.club_name, "FC Porrentruy");
  assert.equal(empty?.notes, null);
});

test("Excel conserve les sauts de ligne de la colonne note", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Club", "note"],
    ["FC Excel", MAIL],
    ["Sans note", ""],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Prospects");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const parsed = parseExcelBuffer(arrayBuffer, "prospects.xlsx");
  const mapping = autoMapColumns(parsed.columns);
  const row = mapRowToProspect(parsed.columns, parsed.rows[0], mapping);
  assert.equal(row?.notes, MAIL);
  const empty = mapRowToProspect(parsed.columns, parsed.rows[1], mapping);
  assert.equal(empty?.notes, null);
});

test("création : note et notes alimentent la même colonne, dans le même payload", () => {
  const fromNote = buildProspectInsertPayload("user-1", { club_name: "ACME", note: MAIL });
  assert.equal(fromNote.notes, MAIL);
  assert.equal("note" in fromNote, false);
  assert.equal(fromNote.club_name, "ACME");

  const fromNotes = buildProspectInsertPayload("user-1", { club_name: "ACME", notes: MAIL });
  assert.equal(fromNotes.notes, MAIL);

  const preferNote = buildProspectInsertPayload("user-1", {
    club_name: "ACME",
    note: "depuis note",
    notes: "depuis notes",
  });
  assert.equal(preferNote.notes, "depuis note");

  const blank = buildProspectInsertPayload("user-1", { club_name: "ACME", note: "  \n\t  " });
  assert.equal(blank.notes, null);
});

test("import : la note vide n'empêche pas le payload, la note pleine est dans l'insert", () => {
  const withNote = buildProspectImportPayload("user-1", { club_name: "ACME", note: `  ${MAIL}  ` });
  assert.equal(withNote.notes, MAIL);
  assert.equal(withNote.status, "À contacter");

  const without = buildProspectImportPayload("user-1", { club_name: "ACME" });
  assert.equal(without.notes, null);
});

console.log(`\n${passed} ok, ${failed} ko`);
if (failed > 0) process.exit(1);
