/**
 * Palette d'avatars (couleurs) sélectionnables à l'onboarding.
 * Chaque couleur = un gradient Tailwind + un libellé.
 */

export type AvatarColorId =
  | "indigo"
  | "violet"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose"
  | "fuchsia"
  | "sky";

export type AvatarColor = {
  id: AvatarColorId;
  label: string;
  gradient: string; // classes Tailwind "from-... via-... to-..."
  ring: string;
};

export const AVATAR_COLORS: AvatarColor[] = [
  { id: "indigo",  label: "Indigo",  gradient: "from-indigo-500 to-blue-500",    ring: "ring-indigo-400/50" },
  { id: "violet",  label: "Violet",  gradient: "from-violet-500 to-fuchsia-500", ring: "ring-violet-400/50" },
  { id: "cyan",    label: "Cyan",    gradient: "from-cyan-500 to-teal-500",      ring: "ring-cyan-400/50" },
  { id: "emerald", label: "Emerald", gradient: "from-emerald-500 to-lime-500",   ring: "ring-emerald-400/50" },
  { id: "amber",   label: "Amber",   gradient: "from-amber-500 to-orange-500",   ring: "ring-amber-400/50" },
  { id: "rose",    label: "Rose",    gradient: "from-rose-500 to-pink-500",      ring: "ring-rose-400/50" },
  { id: "fuchsia", label: "Fuchsia", gradient: "from-fuchsia-500 to-pink-500",   ring: "ring-fuchsia-400/50" },
  { id: "sky",     label: "Sky",     gradient: "from-sky-500 to-blue-500",       ring: "ring-sky-400/50" },
];

export function isAvatarColorId(value: unknown): value is AvatarColorId {
  return AVATAR_COLORS.some((c) => c.id === value);
}

export function getAvatarColor(id: string | null | undefined): AvatarColor {
  if (id && isAvatarColorId(id)) {
    return AVATAR_COLORS.find((c) => c.id === id)!;
  }
  return AVATAR_COLORS[0];
}
