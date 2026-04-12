import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { landingDivider, landingSection } from "./landing-tokens";

type LandingFooterProps = {
  brand: LandingContent["brand"];
  footer: LandingContent["footer"];
};

export function LandingFooter({ brand, footer }: LandingFooterProps) {
  return (
    <footer className={landingDivider}>
      <div
        className={`${landingSection} flex flex-col gap-6 py-10 text-sm text-neutral-500 md:flex-row md:items-center md:justify-between md:py-12`}
      >
        <span className="font-display text-base tracking-tight text-neutral-950 lowercase">{brand.name}</span>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {footer.links.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-neutral-950">
              {l.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-neutral-400 md:text-right">{footer.note}</p>
      </div>
    </footer>
  );
}
