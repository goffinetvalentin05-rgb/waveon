import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { BrandLogoLink } from "./BrandLogoLink";
import { landingSection } from "./landing-tokens";

type LandingHeaderProps = {
  brand: LandingContent["brand"];
  header: LandingContent["header"];
};

export function LandingHeader({ brand, header }: LandingHeaderProps) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className={`${landingSection} flex h-16 items-center justify-between gap-6 md:h-[4.5rem]`}>
        <BrandLogoLink brand={brand} variant="header" />
        <Link
          href={header.cta.href}
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-neutral-950 px-5 py-2 text-xs font-medium text-white md:px-7 md:text-sm"
        >
          {header.cta.label}
        </Link>
      </div>
    </header>
  );
}
