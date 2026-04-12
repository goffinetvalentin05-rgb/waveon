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
    <footer className={landingDivider}>
      <div
        className={`${landingSection} flex flex-col gap-6 py-10 text-sm text-neutral-950 md:flex-row md:items-center md:justify-between md:py-12`}
      >
        <BrandLogoLink brand={brand} variant="footer" />
        {hasLinks ? (
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {footer.links.map((l) => (
              <Link key={l.href} href={l.href} className="underline-offset-4 hover:underline">
                {l.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
