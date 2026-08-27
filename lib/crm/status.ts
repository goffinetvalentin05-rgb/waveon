import { isProspectStatus, type ProspectStatus } from "./types";
import { closedReasonFromLegacyStatus, type ClosedReason } from "./closed";

type BadgeStyle = { bg: string; text: string; dot: string; label: string };

/** Couleurs des badges — teintes douces, groupées par phase. */
export const STATUS_STYLES: Record<ProspectStatus, BadgeStyle> = {
  "À contacter": { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "À contacter" },
  "Relance 1": { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", label: "Relance 1" },
  "Relance 2": { bg: "bg-orange-50", text: "text-orange-800", dot: "bg-orange-500", label: "Relance 2" },
  Relais: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-300", label: "Relais" },
  "En discussion": { bg: "bg-violet-50", text: "text-violet-800", dot: "bg-violet-500", label: "En discussion" },
  Démo: { bg: "bg-cyan-50", text: "text-cyan-800", dot: "bg-cyan-500", label: "Démo" },
  Client: { bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500", label: "Client" },
  Fermé: { bg: "bg-rose-50", text: "text-rose-800", dot: "bg-rose-500", label: "Fermé" },
};

/**
 * Anciens statuts (v1/v2) → pipeline à 7 colonnes.
 * « Réponse reçue » n'est pas « En discussion » : une réponse ne suffit pas.
 */
const LEGACY_TO_CURRENT: Record<string, ProspectStatus> = {
  Nouveau: "À contacter",
  "1er contact envoyé": "Relance 1",
  Contacté: "Relance 1",
  "En conversation": "Relance 1",
  "À recontacter plus tard": "Relance 1",
  "Réponse reçue": "Relance 1",
  Répondu: "Relance 1",
  "Relance 3 / dernière relance": "Relance 2",
  "Sans réponse": "Relance 2",
  "À qualifier": "En discussion",
  Intéressé: "En discussion",
  "En réflexion": "En discussion",
  Négociation: "En discussion",
  "Discussion avec comité / équipe": "En discussion",
  "Offre / prix envoyé": "En discussion",
  "Démo à planifier": "Démo",
  "Démo prévue": "Démo",
  Démonstration: "Démo",
  "Démo effectuée": "Démo",
  "Démo faite": "Démo",
  "À relancer après démo": "Démo",
  "Appel booké": "Démo",
  Closé: "Client",
  "Pas maintenant": "Fermé",
  "Pas intéressé": "Fermé",
  Perdu: "Fermé",
  Refusé: "Fermé",
  Refus: "Fermé",
};

export function migrateProspectStatus(status: string): ProspectStatus {
  if (isProspectStatus(status)) return status;
  return LEGACY_TO_CURRENT[status] ?? "À contacter";
}

export function isRelayStatus(status: string): boolean {
  return migrateProspectStatus(status) === "Relais";
}

export function inferredClosedReason(status: string): ClosedReason | null {
  return closedReasonFromLegacyStatus(status);
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
    "À contacter": ["Nouveau"],
    "Relance 1": ["1er contact envoyé", "Contacté", "En conversation", "À recontacter plus tard", "Réponse reçue", "Répondu"],
    "Relance 2": ["Relance 3 / dernière relance", "Sans réponse"],
    Relais: [],
    "En discussion": [
      "À qualifier",
      "Intéressé",
      "En réflexion",
      "Négociation",
      "Discussion avec comité / équipe",
      "Offre / prix envoyé",
    ],
    Démo: [
      "Démo à planifier",
      "Démo prévue",
      "Démonstration",
      "Démo effectuée",
      "Démo faite",
      "À relancer après démo",
      "Appel booké",
    ],
    Client: ["Closé"],
    Fermé: ["Pas maintenant", "Pas intéressé", "Perdu", "Refusé", "Refus"],
  };
  return [status, ...(aliases[status] ?? [])];
}

export function expandStatusesForQuery(values: string[]): string[] {
  return [...new Set(values.flatMap((v) => statusesMatching(migrateProspectStatus(v))))];
}

export function encodeStatusChangeDescription(input: {
  to: ProspectStatus;
  from?: string | null;
  closed_reason?: string | null;
  closed_note?: string | null;
}): string {
  return JSON.stringify({
    to: input.to,
    from: input.from ?? null,
    closed_reason: input.closed_reason ?? null,
    closed_note: input.closed_note ?? null,
  });
}

export function parseStatusChangePayload(description: string | null): {
  to: ProspectStatus | null;
  closed_reason: string | null;
  closed_note: string | null;
} {
  if (!description) return { to: null, closed_reason: null, closed_note: null };
  const trimmed = description.trim();
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const toRaw = obj.to ?? obj.toStatus ?? obj.status;
      return {
        to: typeof toRaw === "string" ? migrateProspectStatus(toRaw) : null,
        closed_reason: typeof obj.closed_reason === "string" ? obj.closed_reason : null,
        closed_note: typeof obj.closed_note === "string" ? obj.closed_note : null,
      };
    } catch {
      return { to: migrateProspectStatus(trimmed), closed_reason: null, closed_note: null };
    }
  }
  return { to: migrateProspectStatus(trimmed), closed_reason: inferredClosedReason(trimmed), closed_note: trimmed === "Perdu" ? "Perdu" : null };
}
