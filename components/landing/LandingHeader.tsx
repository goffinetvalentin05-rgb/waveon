import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { landingSection } from "./landing-tokens";

type LandingHeaderProps = {
  brand: LandingContent["brand"];
  nav: LandingContent["nav"];
};

export function LandingHeader({ brand, nav }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-white/90 backdrop-blur-md">
      <div className={`${landingSection} flex h-16 items-center justify-between gap-8 md:h-[4.5rem]`}>
        <Link
          href="/"
          className="font-display text-xl font-normal tracking-tight text-neutral-950 lowercase md:text-2xl"
        >
          {brand.name}
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-neutral-600 sm:flex">
          {nav.links.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-neutral-950">
              {item.label}
            </Link>
          ))}
          <Link href={nav.login.href} className="transition hover:text-neutral-950">
            {nav.login.label}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={nav.login.href}
            className="text-sm text-neutral-600 transition hover:text-neutral-950 md:hidden"
          >
            {nav.login.label}
          </Link>
          <Link
            href={nav.cta.href}
            className="inline-flex items-center justify-center rounded-full bg-neutral-950 px-5 py-2.5 text-xs font-medium tracking-wide text-white md:px-6 md:text-sm"
          >
            {nav.cta.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
