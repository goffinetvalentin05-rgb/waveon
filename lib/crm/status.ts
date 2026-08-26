import { PROSPECT_STATUSES, type ProspectStatus } from "./types";

type BadgeStyle = { bg: string; text: string; dot: string; label: string };

/** Couleurs des badges — teintes douces, groupées par phase. */
export const STATUS_STYLES: Record<ProspectStatus, BadgeStyle> = {
  "À contacter": { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "À contacter" },
  "1er contact envoyé": { bg: "bg-sky-50", text: "text-sky-800", dot: "bg-sky-500", label: "1er contact envoyé" },
  "Relance 1": { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", label: "Relance 1" },
  "Relance 2": { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", label: "Relance 2" },
  "Relance 3 / dernière relance": {
    bg: "bg-orange-50",
    text: "text-orange-800",
    dot: "bg-orange-500",
    label: "Relance 3 / dernière relance",
  },
  "Sans réponse": { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Sans réponse" },
  "À recontacter plus tard": {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    label: "À recontacter plus tard",
  },
  "Réponse reçue": { bg: "bg-violet-50", text: "text-violet-800", dot: "bg-violet-500", label: "Réponse reçue" },
  "À qualifier": { bg: "bg-violet-50", text: "text-violet-800", dot: "bg-violet-400", label: "À qualifier" },
  Intéressé: { bg: "bg-indigo-50", text: "text-indigo-800", dot: "bg-indigo-500", label: "Intéressé" },
  "Démo à planifier": { bg: "bg-cyan-50", text: "text-cyan-800", dot: "bg-cyan-500", label: "Démo à planifier" },
  "Démo prévue": { bg: "bg-cyan-50", text: "text-cyan-800", dot: "bg-cyan-500", label: "Démo prévue" },
  "Démo effectuée": { bg: "bg-indigo-50", text: "text-indigo-800", dot: "bg-indigo-500", label: "Démo effectuée" },
  "À relancer après démo": {
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    dot: "bg-indigo-400",
    label: "À relancer après démo",
  },
  "En réflexion": { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", label: "En réflexion" },
  "Discussion avec comité / équipe": {
    bg: "bg-violet-50",
    text: "text-violet-800",
    dot: "bg-violet-500",
    label: "Discussion avec comité / équipe",
  },
  "Offre / prix envoyé": { bg: "bg-sky-50", text: "text-sky-800", dot: "bg-sky-500", label: "Offre / prix envoyé" },
  Client: { bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500", label: "Client" },
  "Pas maintenant": { bg: "bg-rose-50", text: "text-rose-800", dot: "bg-rose-400", label: "Pas maintenant" },
  "Pas intéressé": { bg: "bg-rose-50", text: "text-rose-800", dot: "bg-rose-500", label: "Pas intéressé" },
  Perdu: { bg: "bg-rose-50", text: "text-rose-800", dot: "bg-rose-500", label: "Perdu" },
};

const LEGACY_TO_CURRENT: Record<string, ProspectStatus> = {
  Contacté: "1er contact envoyé",
  Répondu: "Réponse reçue",
  "Démo faite": "Démo effectuée",
  Négociation: "En réflexion",
  Refusé: "Pas intéressé",
  Refus: "Pas intéressé",
  Démonstration: "Démo prévue",
  "Relance 1": "Relance 1",
  "Relance 2": "Relance 2",
  Nouveau: "À contacter",
  "En conversation": "1er contact envoyé",
  "Appel booké": "Démo prévue",
  Closé: "Client",
};

export function migrateProspectStatus(status: string): ProspectStatus {
  if ((PROSPECT_STATUSES as readonly string[]).includes(status)) {
    return status as ProspectStatus;
  }
  return LEGACY_TO_CURRENT[status] ?? "À contacter";
}

export function statusStyle(status: string) {
  const mapped = migrateProspectStatus(status);
  return (
    STATUS_STYLES[mapped] ?? {
      bg: "bg-wo-hover",
      text: "text-wo-secondary",
      dot: "bg-[#8d8f8e]",
      label: status,
    }
  );
}

export function statusesMatching(status: ProspectStatus): string[] {
  const aliases: Partial<Record<ProspectStatus, string[]>> = {
    "1er contact envoyé": ["Contacté"],
    "Réponse reçue": ["Répondu"],
    "Démo effectuée": ["Démo faite"],
    "En réflexion": ["Négociation"],
    "Pas intéressé": ["Refusé", "Refus"],
    "Démo prévue": ["Démonstration"],
  };
  return [status, ...(aliases[status] ?? [])];
}

export function expandStatusesForQuery(values: string[]): string[] {
  return [...new Set(values.flatMap((v) => statusesMatching(migrateProspectStatus(v))))];
}
