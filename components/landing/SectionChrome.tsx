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
      <h2 className="pc-lp-heading">
        <span className="block">{line1}</span>
        {line2Accent || line2Before || line2After ? (
          <span className="mt-2 block">
            {line2Before}
            {Icon ? (
              <span className="pc-title-pill mx-2 inline-flex align-middle">
                <Icon size={20} stroke={2} className="text-white" aria-hidden />
              </span>
            ) : null}
            {line2Accent ? <span className="pc-lp-heading-accent">{line2Accent}</span> : null}
            {line2After}
          </span>
        ) : null}
      </h2>
      {subtitle ? (
        <p className={`pc-lp-subtitle ${align === "center" ? "center" : ""}`}>{subtitle}</p>
      ) : null}
    </div>
  );
}

type SectionShellProps = {
  id?: string;
  children: ReactNode;
  halo?: "blue" | "gold-blue" | "orange" | "intense" | "wide" | "pricing";
  className?: string;
};

const HALO_CLASS: Record<NonNullable<SectionShellProps["halo"]>, string> = {
  blue: "pc-lp-section-halo",
  "gold-blue": "pc-lp-section-halo pc-lp-section-halo-orange",
  orange: "pc-lp-section-halo pc-lp-section-halo-orange",
  intense: "pc-lp-section-halo pc-lp-section-halo-orange",
  wide: "pc-lp-section-halo",
  pricing: "pc-lp-section-halo pc-lp-section-halo-pricing",
};

export function SectionShell({ id, children, halo = "blue", className = "" }: SectionShellProps) {
  return (
    <section id={id} className={`${landing.section} ${className}`}>
      <div className={HALO_CLASS[halo]} aria-hidden />
      <div className={`relative z-[1] ${landing.container}`}>{children}</div>
    </section>
  );
}
