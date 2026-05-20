import type { ReactNode } from "react";

type BentoCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
  tall?: boolean;
};

/** Carte bento type référence : titre en haut + zone visuelle glass en dessous. */
export function BentoCard({ title, subtitle, children, className = "", tall }: BentoCardProps) {
  return (
    <article
      className={`pc-bento-card group flex h-full flex-col ${tall ? "min-h-[340px]" : "min-h-[300px]"} ${className}`}
    >
      <div className="relative z-[2] px-5 pt-5 sm:px-6 sm:pt-6">
        <h3 className="font-[family-name:var(--font-display)] text-[1.125rem] font-semibold tracking-[-0.02em] text-white sm:text-xl">
          {title}
        </h3>
        <p className="mt-1 text-xs text-[#9ca3af] sm:text-sm">{subtitle}</p>
      </div>
      <div className="pc-bento-canvas relative z-[1] mx-4 mb-4 mt-3 flex flex-1 items-center justify-center overflow-hidden rounded-2xl sm:mx-5 sm:mb-5">
        {children}
      </div>
    </article>
  );
}
