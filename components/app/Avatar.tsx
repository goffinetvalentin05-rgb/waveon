import { getAvatarColor } from "@/lib/pronoclash/avatar-colors";

type AvatarProps = {
  username?: string | null;
  colorId?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
} as const;

export function Avatar({ username, colorId, size = "md", className = "" }: AvatarProps) {
  const color = getAvatarColor(colorId);
  const initials = (username?.trim()?.[0] || "?").toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${color.gradient} font-display font-bold text-white shadow-[0_8px_20px_-8px_rgba(99,102,241,0.5)] ${sizeMap[size]} ${className}`}
      aria-label={username ?? "Avatar"}
    >
      {initials}
    </span>
  );
}
