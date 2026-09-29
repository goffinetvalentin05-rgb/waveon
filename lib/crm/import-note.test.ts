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

const SCREENSHOT_COLUMNS = [
  "Nom / entreprise",
  "Ville",
  "Pays",
  "Adresse",
  "Nom du contact",
  "Fonction du contact",
  "Téléphone",
  "Email",
  "Site web",
  "LinkedIn",
  "Source",
  "Canal",
  "Priorité",
  "Valeur potentielle (CHF)",
  "Tags",
  "Note",
  "Colonne inconnue",
];

test("auto-mapping : colonnes Excel alignées sur les libellés de la fiche", () => {
  const mapping = autoMapColumns(SCREENSHOT_COLUMNS);
  assert.equal(mapping["Nom / entreprise"], "club_name");
  assert.equal(mapping["Ville"], "ville");
  assert.equal(mapping["Pays"], "country");
  assert.equal(mapping["Adresse"], "address");
  assert.equal(mapping["Nom du contact"], "contact_name");
  assert.equal(mapping["Fonction du contact"], "contact_function");
  assert.equal(mapping["Téléphone"], "phone");
  assert.equal(mapping["Email"], "email");
  assert.equal(mapping["Site web"], "website");
  assert.equal(mapping["LinkedIn"], "linkedin_url");
  assert.equal(mapping["Source"], "source");
  assert.equal(mapping["Canal"], "contact_channel");
  assert.equal(mapping["Priorité"], "priority");
  assert.equal(mapping["Valeur potentielle (CHF)"], "potential_value");
  assert.equal(mapping["Tags"], "tags");
  assert.equal(mapping["Note"], "notes");
  assert.equal(mapping["Colonne inconnue"], "");
});

test("auto-mapping : correspondances proches sans collision contact / ville", () => {
  const mapping = autoMapColumns([
    "Fonction du contact",
    "Valeur potentielle",
    "Nom / entreprise",
    "Ville",
    "Région",
  ]);
  assert.equal(mapping["Fonction du contact"], "contact_function");
  assert.equal(mapping["Valeur potentielle"], "potential_value");
  assert.equal(mapping["Nom / entreprise"], "club_name");
  assert.equal(mapping["Ville"], "ville");
  assert.equal(mapping["Région"], "canton");
});

test("import Excel : toutes les valeurs mappées sont persistées sur le prospect", () => {
  const columns = SCREENSHOT_COLUMNS.filter((c) => c !== "Colonne inconnue");
  const row = [
    "Hôtel Splendide",
    "Montreux",
    "Suisse",
    "Grand-Rue 1",
    "Marie Dupont",
    "Directrice",
    "0791234567",
    "marie@splendide.ch",
    "https://splendide.ch",
    "https://linkedin.com/in/marie",
    "Salon",
    "email",
    "haute",
    "12'500",
    "hot; vip",
    "Relance après le salon",
  ];
  const mapped = mapRowToProspect(columns, row, autoMapColumns(columns));
  assert.ok(mapped);
  assert.equal(mapped?.ville, "Montreux");
  assert.equal(mapped?.country, "Suisse");
  assert.equal(mapped?.address, "Grand-Rue 1");
  assert.equal(mapped?.contact_function, "Directrice");
  assert.equal(mapped?.linkedin_url, "https://linkedin.com/in/marie");
  assert.equal(mapped?.source, "Salon");
  assert.equal(mapped?.contact_channel, "email");
  assert.equal(mapped?.priority, "haute");
  assert.equal(mapped?.potential_value, "12'500");
  assert.equal(mapped?.tags, "hot; vip");
  assert.equal(mapped?.notes, "Relance après le salon");

  const payload = buildProspectImportPayload("user-1", mapped!);
  assert.equal(payload.club_name, "Hôtel Splendide");
  assert.equal(payload.ville, "Montreux");
  assert.equal(payload.country, "Suisse");
  assert.equal(payload.address, "Grand-Rue 1");
  assert.equal(payload.contact_name, "Marie Dupont");
  assert.equal(payload.contact_function, "Directrice");
  assert.equal(payload.phone, "0791234567");
  assert.equal(payload.email, "marie@splendide.ch");
  assert.equal(payload.website, "https://splendide.ch");
  assert.equal(payload.linkedin_url, "https://linkedin.com/in/marie");
  assert.equal(payload.source, "Salon");
  assert.equal(payload.contact_channel, "Email");
  assert.equal(payload.priority, "Haute");
  assert.equal(payload.potential_value, 12500);
  assert.deepEqual(payload.tags, ["hot", "vip"]);
  assert.equal(payload.notes, "Relance après le salon");
  assert.equal("note" in payload, false);
});

console.log(`\n${passed} ok, ${failed} ko`);
if (failed > 0) process.exit(1);
