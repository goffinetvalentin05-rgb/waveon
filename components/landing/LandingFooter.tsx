import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { BrandLogoLink } from "./BrandLogoLink";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingFooterProps = {
  brand: LandingContent["brand"];
  footer: LandingContent["footer"];
};

export function LandingFooter({ brand, footer }: LandingFooterProps) {
  const hasLinks = footer.links.length > 0;

  return (
    <footer className={`${landingDivider} bg-neutral-50/40`}>
      <div
        className={`${landingSection} flex flex-col gap-8 py-14 text-sm text-neutral-600 md:flex-row md:items-center md:justify-between md:py-16`}
      >
        <BrandLogoLink brand={brand} variant="footer" />
        {hasLinks ? (
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {footer.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-neutral-950 transition hover:text-indigo-950"
              >
                {l.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
