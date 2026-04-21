import { renderTemplateText, type TemplateVars } from "@/lib/emails/configurable";

/** Normalise les retours à la ligne (y compris littéraux `\n` stockés en base). */
export function normalizeEmailPlainText(raw: string): string {
  return String(raw ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
}

/** Texte déjà interpolé → paragraphes (séparateur : lignes vides). */
export function plainTextToParagraphs(text: string): string[] {
  const t = normalizeEmailPlainText(text);
  return t
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Corps de template rendu puis découpé en paragraphes (séparateur : lignes vides). */
export function templateBodyToParagraphs(templateRaw: string, vars: TemplateVars): string[] {
  return plainTextToParagraphs(renderTemplateText(templateRaw, vars));
}
