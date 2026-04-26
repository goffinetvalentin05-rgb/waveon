/** Nom de fichier sûr pour un téléchargement PDF. */
export function normalizeFileName(name: string): string {
  return (name || "facture")
    .replace(/[^a-zA-Z0-9\-_.]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}
