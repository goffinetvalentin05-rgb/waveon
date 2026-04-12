import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { BrandLogoLink } from "./BrandLogoLink";
import { landingBtnPrimarySm } from "./landing-tokens";

type LandingHeaderProps = {
  brand: LandingContent["brand"];
  header: LandingContent["header"];
};

export function LandingHeader({ brand, header }: LandingHeaderProps) {
  return (
    <header className="relative z-20 px-5 pt-4 md:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-neutral-100 bg-white/90 px-4 py-2.5 shadow-[0_2px_32px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md sm:min-h-[5rem] sm:gap-5 sm:px-5 md:min-h-[5.5rem] md:px-7 lg:min-h-24">
        <BrandLogoLink brand={brand} variant="header" />
        <Link href={header.cta.href} className={landingBtnPrimarySm}>
          {header.cta.label}
        </Link>
      </div>
    </header>
  );
}
