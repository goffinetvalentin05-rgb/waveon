import type { ReactNode } from "react";
import type { Icon } from "@tabler/icons-react";
import { landing } from "./landing-styles";

type SectionTitleProps = {
  line1: string;
  line2Before?: string;
  line2Accent?: string;
  line2After?: string;
  icon?: Icon;
  subtitle?: string;
  align?: "center" | "left";
};

export function SectionTitle({
  line1,
  line2Before = "",
  line2Accent,
  line2After = "",
  icon: Icon,
  subtitle,
  align = "center",
}: SectionTitleProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={`max-w-4xl ${alignClass}`}>
      <h2 className="pc-section-heading">
        <span className="block text-white/95">{line1}</span>
        <span className="mt-2 block">
          {line2Before}
          {Icon ? (
            <span className="pc-title-pill mx-2 inline-flex align-middle">
              <Icon size={20} stroke={2} className="text-white" aria-hidden />
            </span>
          ) : null}
          {line2Accent ? (
            <span className="text-blue-400 drop-shadow-[0_0_24px_rgba(59,130,246,0.45)]">
              {line2Accent}
            </span>
          ) : null}
          {line2After}
        </span>
      </h2>
      {subtitle ? (
        <p
          className={`mt-5 text-sm text-[#9ca3af] sm:text-base ${align === "center" ? "mx-auto max-w-lg" : "max-w-lg"}`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

type SectionShellProps = {
  id?: string;
  children: ReactNode;
  halo?: "blue" | "gold-blue" | "intense" | "wide" | "pricing";
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
