import type { ProspectStatus } from "./types";

/** Couleurs des badges de statut — dark premium, accents sémantiques. */
export const STATUS_STYLES: Record<
  ProspectStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  "À contacter": {
    bg: "bg-white/[0.06]",
    text: "text-[#c2d4cc]",
    dot: "bg-[#8a9e96]",
    label: "À contacter",
  },
  Contacté: {
    bg: "bg-teal-500/15",
    text: "text-teal-200",
    dot: "bg-teal-400",
    label: "Contacté",
  },
  Répondu: {
    bg: "bg-sky-500/15",
    text: "text-sky-200",
    dot: "bg-sky-400",
    label: "Répondu",
  },
  "Démo prévue": {
    bg: "bg-cyan-500/15",
    text: "text-cyan-100",
    dot: "bg-cyan-400",
    label: "Démo prévue",
  },
  "Démo faite": {
    bg: "bg-emerald-500/15",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    label: "Démo faite",
  },
  Négociation: {
    bg: "bg-amber-500/15",
    text: "text-amber-200",
    dot: "bg-amber-400",
    label: "Négociation",
  },
  Client: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    label: "Client",
  },
  Refusé: {
    bg: "bg-rose-500/15",
    text: "text-rose-200",
    dot: "bg-rose-400",
    label: "Refusé",
  },
};

export function statusStyle(status: string) {
  const legacy: Record<string, ProspectStatus> = {
    "Relance 1": "Contacté",
    "Relance 2": "Contacté",
    Démonstration: "Démo prévue",
    Refus: "Refusé",
    "Pas intéressé": "Refusé",
  };
  const mapped = legacy[status] ?? status;
  return (
    STATUS_STYLES[mapped as ProspectStatus] ?? {
      bg: "bg-white/[0.06]",
      text: "text-[#c2d4cc]",
      dot: "bg-[#8a9e96]",
      label: status,
    }
  );
}
