import { PROSPECT_STATUSES, type ProspectStatus } from "./types";

type BadgeStyle = { bg: string; text: string; dot: string; label: string };

/** Couleurs des badges — teintes douces, groupées par phase. */
export const STATUS_STYLES: Record<ProspectStatus, BadgeStyle> = {
  "À contacter": { bg: "bg-white/[0.06]", text: "text-[#c8cbc9]", dot: "bg-[#8d8f8e]", label: "À contacter" },
  "1er contact envoyé": { bg: "bg-sky-500/15", text: "text-sky-200", dot: "bg-sky-400", label: "1er contact envoyé" },
  "Relance 1": { bg: "bg-amber-500/15", text: "text-amber-200", dot: "bg-amber-400", label: "Relance 1" },
  "Relance 2": { bg: "bg-amber-500/20", text: "text-amber-100", dot: "bg-amber-400", label: "Relance 2" },
  "Relance 3 / dernière relance": {
    bg: "bg-orange-500/15",
    text: "text-orange-200",
    dot: "bg-orange-400",
    label: "Relance 3 / dernière relance",
  },
  "Sans réponse": { bg: "bg-white/[0.05]", text: "text-[#a8aaa9]", dot: "bg-[#6a6c6b]", label: "Sans réponse" },
  "À recontacter plus tard": {
    bg: "bg-slate-500/15",
    text: "text-slate-200",
    dot: "bg-slate-400",
    label: "À recontacter plus tard",
  },
  "Réponse reçue": { bg: "bg-violet-500/15", text: "text-violet-200", dot: "bg-violet-400", label: "Réponse reçue" },
  "À qualifier": { bg: "bg-violet-500/10", text: "text-violet-200", dot: "bg-violet-300", label: "À qualifier" },
  Intéressé: { bg: "bg-indigo-500/15", text: "text-indigo-200", dot: "bg-indigo-400", label: "Intéressé" },
  "Démo à planifier": { bg: "bg-cyan-500/15", text: "text-cyan-200", dot: "bg-cyan-400", label: "Démo à planifier" },
  "Démo prévue": { bg: "bg-cyan-500/20", text: "text-cyan-100", dot: "bg-cyan-400", label: "Démo prévue" },
  "Démo effectuée": { bg: "bg-teal-500/15", text: "text-teal-200", dot: "bg-teal-400", label: "Démo effectuée" },
  "À relancer après démo": {
    bg: "bg-teal-500/10",
    text: "text-teal-200",
    dot: "bg-teal-300",
    label: "À relancer après démo",
  },
  "En réflexion": { bg: "bg-amber-500/15", text: "text-amber-200", dot: "bg-amber-400", label: "En réflexion" },
  "Discussion avec comité / équipe": {
    bg: "bg-violet-500/15",
    text: "text-violet-200",
    dot: "bg-violet-400",
    label: "Discussion avec comité / équipe",
  },
  "Offre / prix envoyé": { bg: "bg-sky-500/15", text: "text-sky-200", dot: "bg-sky-400", label: "Offre / prix envoyé" },
  Client: { bg: "bg-emerald-500/15", text: "text-emerald-200", dot: "bg-emerald-400", label: "Client" },
  "Pas maintenant": { bg: "bg-rose-500/10", text: "text-rose-200", dot: "bg-rose-300", label: "Pas maintenant" },
  "Pas intéressé": { bg: "bg-rose-500/15", text: "text-rose-200", dot: "bg-rose-400", label: "Pas intéressé" },
  Perdu: { bg: "bg-rose-500/15", text: "text-rose-200", dot: "bg-rose-400", label: "Perdu" },
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
      bg: "bg-white/[0.06]",
      text: "text-[#c8cbc9]",
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
