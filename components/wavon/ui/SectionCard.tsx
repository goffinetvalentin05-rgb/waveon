import type { ReactNode } from "react";
import { cardClass, sectionDescClass, sectionTitleClass } from "@/lib/wavon/tokens";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  headerRight?: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  children,
  headerRight,
  className = "",
}: SectionCardProps) {
  return (
    <section className={`${cardClass} ${className}`}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={sectionTitleClass}>{title}</h2>
          {description ? <p className={sectionDescClass}>{description}</p> : null}
        </div>
        {headerRight}
      </div>
      {children}
    </section>
  );
}
