import type { ProspectStatus } from "./types";

/** Couleurs des badges de statut — dark premium, accents sémantiques. */
export const STATUS_STYLES: Record<
  ProspectStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  "À contacter": {
    bg: "bg-white/[0.06]",
    text: "text-[#c8c3d6]",
    dot: "bg-[#8b869c]",
    label: "À contacter",
  },
  Contacté: {
    bg: "bg-violet-500/15",
    text: "text-violet-200",
    dot: "bg-violet-400",
    label: "Contacté",
  },
  "Relance 1": {
    bg: "bg-amber-500/15",
    text: "text-amber-200",
    dot: "bg-amber-400",
    label: "Relance 1",
  },
  "Relance 2": {
    bg: "bg-orange-500/15",
    text: "text-orange-200",
    dot: "bg-orange-400",
    label: "Relance 2",
  },
  Démonstration: {
    bg: "bg-violet-500/20",
    text: "text-violet-100",
    dot: "bg-violet-400",
    label: "Démonstration",
  },
  Client: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    label: "Client",
  },
  Refus: {
    bg: "bg-rose-500/15",
    text: "text-rose-200",
    dot: "bg-rose-400",
    label: "Refus",
  },
  "Pas intéressé": {
    bg: "bg-white/[0.06]",
    text: "text-[#8b869c]",
    dot: "bg-[#6a6578]",
    label: "Pas intéressé",
  },
};

export function statusStyle(status: string) {
  return (
    STATUS_STYLES[status as ProspectStatus] ?? {
      bg: "bg-white/[0.06]",
      text: "text-[#c8c3d6]",
      dot: "bg-[#8b869c]",
      label: status,
    }
  );
}
