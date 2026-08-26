import { DEFAULT_PROJECT_COLOR, looksLikeProjectLogo } from "@/lib/projects/logo";

export type ProjectAvatarSource = {
  name: string;
  logo_url?: string | null;
  icon?: string | null;
  color?: string | null;
};

const SIZE_CLASS: Record<"xs" | "sm" | "md" | "lg", string> = {
  xs: "h-5 w-5 rounded-md text-[10px]",
  sm: "h-8 w-8 rounded-lg text-xs",
  md: "h-10 w-10 rounded-[12px] text-sm",
  lg: "h-14 w-14 rounded-2xl text-xl",
};

export function ProjectAvatar({
  project,
  size = "md",
  className = "",
  inverted = false,
}: {
  project: ProjectAvatarSource;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  inverted?: boolean;
}) {
  const logo = project.logo_url?.trim() || (looksLikeProjectLogo(project.icon) ? project.icon : null);
  const emoji = !logo && project.icon && !looksLikeProjectLogo(project.icon) ? project.icon.slice(0, 2) : null;
  const letter = project.name.trim().slice(0, 1).toUpperCase() || "P";
  const box = `${SIZE_CLASS[size]} ${className} flex shrink-0 items-center justify-center overflow-hidden font-semibold leading-none`;

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logos may be data URLs
      <img src={logo} alt="" className={`${box} bg-white object-cover`} />
    );
  }

  return (
    <span
      className={box}
      style={
        inverted
          ? { background: "rgba(255,255,255,0.18)", color: "#fff" }
          : { background: `${DEFAULT_PROJECT_COLOR}18`, color: DEFAULT_PROJECT_COLOR }
      }
    >
      {emoji || letter}
    </span>
  );
}
