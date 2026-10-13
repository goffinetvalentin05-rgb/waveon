import * as XLSX from "xlsx";
import { IMPORT_FIELDS } from "@/lib/crm/import-fields";

/** En-têtes du modèle Excel — source unique = IMPORT_FIELDS. */
export function importTemplateHeaders(): string[] {
  return IMPORT_FIELDS.map((field) => field.label);
}

const FIELD_HINTS: Partial<Record<(typeof IMPORT_FIELDS)[number]["key"], string>> = {
  club_name: "Obligatoire. Nom de l’entreprise ou du club.",
  sport: "Secteur d’activité (ex. Fitness, Football, SaaS).",
  canton: "Canton suisse ou région.",
  ville: "Ville du siège ou du lieu principal.",
  country: "Ex. Suisse, France.",
  address: "Adresse postale complète si connue.",
  contact_name: "Personne à contacter.",
  contact_function: "Ex. Founder, Directeur, Président.",
  phone: "Format libre (ex. +41 79 123 45 67).",
  email: "Adresse e-mail professionnelle.",
  website: "URL du site (avec ou sans https://).",
  linkedin_url: "URL du profil LinkedIn entreprise ou contact.",
  source: "Origine du prospect (ex. LinkedIn, Salon, Recommandation).",
  contact_channel: "Email, Téléphone, LinkedIn, WhatsApp, Rencontre, Autre…",
  priority: "Faible, Normale, Haute ou Urgente.",
  potential_value: "Montant numérique en CHF (ex. 2500 ou 12'000).",
  tags: "Séparer par des virgules (ex. prioritaire, partner).",
  notes: "Texte libre : pitch, contexte, emails de prospection…",
};

function buildInstructionsSheet() {
  const rows: string[][] = [
    ["Champ", "Consigne"],
    ["Format", "Une ligne = un prospect. Ne pas renommer ni supprimer les en-têtes de la feuille Prospects."],
    ["Import", "Dans Raven : Pipeline → Importer → sélectionner ce fichier. Les colonnes sont reconnues automatiquement."],
    ["Projet", "Les prospects importés sont rattachés au projet actif et attribués à vous par défaut."],
    ["ChatGPT", "Vous pouvez transmettre ce modèle vide à ChatGPT pour générer une liste, puis l’importer dans Raven."],
    ["", ""],
    ["Colonne", "Détail"],
  ];

  for (const field of IMPORT_FIELDS) {
    const required = field.required ? " (obligatoire)" : "";
    rows.push([
      field.label,
      `${FIELD_HINTS[field.key] ?? "Champ optionnel."}${required}`,
    ]);
  }

  return XLSX.utils.aoa_to_sheet(rows);
}

/** Génère un classeur .xlsx vierge compatible avec l’importateur Raven. */
export function buildImportTemplateWorkbook(): XLSX.WorkBook {
  const headers = importTemplateHeaders();
  const prospects = XLSX.utils.aoa_to_sheet([headers]);

  // Largeurs de colonnes lisibles
  prospects["!cols"] = headers.map((h) => ({
    wch: Math.min(28, Math.max(14, h.length + 2)),
  }));

  const instructions = buildInstructionsSheet();
  instructions["!cols"] = [{ wch: 28 }, { wch: 72 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, prospects, "Prospects");
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");
  return wb;
}

export function importTemplateFilename(): string {
  return "modele_prospects_raven.xlsx";
}

/** Télécharge le modèle côté navigateur. */
export function downloadImportTemplate(): void {
  const wb = buildImportTemplateWorkbook();
  XLSX.writeFile(wb, importTemplateFilename());
}
