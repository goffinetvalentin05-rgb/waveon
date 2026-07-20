import type { ProspectStatus } from "./types";

/** Couleurs des badges de statut — palette bleu/blanc + accents sémantiques. */
export const STATUS_STYLES: Record<
  ProspectStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  "À contacter": {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    label: "À contacter",
  },
  Contacté: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    dot: "bg-sky-500",
    label: "Contacté",
  },
  "Relance 1": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Relance 1",
  },
  "Relance 2": {
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-500",
    label: "Relance 2",
  },
  Démonstration: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-500",
    label: "Démonstration",
  },
  Client: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Client",
  },
  Refus: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-500",
    label: "Refus",
  },
};

export function statusStyle(status: string) {
  return (
    STATUS_STYLES[status as ProspectStatus] ?? {
      bg: "bg-slate-100",
      text: "text-slate-700",
      dot: "bg-slate-400",
      label: status,
    }
  );
}
