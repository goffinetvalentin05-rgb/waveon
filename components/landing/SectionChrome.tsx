import type { ReactNode } from "react";
import type { Icon } from "@tabler/icons-react";
import { landing } from "./landing-styles";

type SectionTitleProps = {
  line1: string;
  line2Before?: string;
  line2After?: string;
  icon: Icon;
  subtitle?: string;
  align?: "center" | "left";
};

export function SectionTitle({
  line1,
  line2Before = "",
  line2After = "",
  icon: Icon,
  subtitle,
  align = "center",
}: SectionTitleProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={`max-w-4xl ${alignClass}`}>
      <h2 className="font-[family-name:var(--font-display)] text-[clamp(2rem,4.5vw,3.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-white">
        <span className="block">{line1}</span>
        <span className="mt-1 block">
          {line2Before}
          <span className="pc-title-pill mx-1.5 inline-flex align-middle">
            <Icon size={18} stroke={2.2} className="text-white" aria-hidden />
          </span>
          {line2After}
        </span>
      </h2>
      {subtitle ? (
        <p className={`mt-4 max-w-xl text-sm text-[#9ca3af] sm:text-base ${align === "center" ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

type SectionShellProps = {
  id?: string;
  children: ReactNode;
  halo?: "blue" | "gold-blue" | "intense";
  className?: string;
};

export function SectionShell({ id, children, halo = "blue", className = "" }: SectionShellProps) {
  return (
    <section id={id} className={`${landing.section} ${className}`}>
      <div className={`pc-section-halo pc-section-halo-${halo}`} aria-hidden />
      <div className={`relative z-[1] ${landing.container}`}>{children}</div>
    </section>
  );
}
