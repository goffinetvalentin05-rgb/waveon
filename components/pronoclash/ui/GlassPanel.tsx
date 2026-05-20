import type { ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  glow?: "none" | "violet" | "orange";
  style?: React.CSSProperties;
};

export function GlassPanel({ children, className = "", glow = "none", style }: GlassPanelProps) {
  const glowClass =
    glow === "violet"
      ? " pc-glass-glow-violet"
      : glow === "orange"
        ? " pc-glass-glow-orange"
        : "";
  return (
    <div className={`pc-glass${glowClass} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
