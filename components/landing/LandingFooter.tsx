import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";
import { BrandLogoLink } from "./BrandLogoLink";
import { landingBtnPrimary, landingSection } from "./landing-tokens";

type LandingFooterProps = {
  brand: LandingContent["brand"];
  footer: LandingContent["footer"];
};

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function LandingFooter({ brand, footer }: LandingFooterProps) {
  const { intro, secondaryIntro, primaryCta, secondaryCta, columns, bottomTagline, localeLabel } = footer;

  const outlineBtn =
    "inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-neutral-950 bg-white px-7 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition-[background-color,color,transform] duration-300 ease-out hover:bg-neutral-950 hover:text-white active:scale-[0.99] motion-reduce:active:scale-100";

  return (
    <footer className="border-t border-neutral-200/80 bg-[#f4f4f4] pb-10 pt-12 md:pb-14 md:pt-16">
      <div className={landingSection}>
        <div className="rounded-[1.75rem] border border-neutral-200/90 bg-white px-6 py-10 shadow-[0_8px_40px_-28px_rgba(0,0,0,0.1),0_2px_8px_-4px_rgba(0,0,0,0.04)] sm:rounded-[2rem] sm:px-8 sm:py-12 md:px-12 md:py-14">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-6 lg:col-span-5">
              <BrandLogoLink brand={brand} variant="footer" />
              <p className="max-w-md text-base leading-relaxed text-neutral-600">{intro}</p>
              <div>
                <Link href={primaryCta.href} className={landingBtnPrimary}>
                  {primaryCta.label}
                </Link>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-neutral-600">{secondaryIntro}</p>
              <div>
                <Link href={secondaryCta.href} className={outlineBtn}>
                  {secondaryCta.label}
                </Link>
              </div>
            </div>

            <div className="grid gap-10 sm:grid-cols-2 lg:col-span-7 lg:justify-end">
              {columns.map((col) => (
                <div key={col.title} className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-950">{col.title}</p>
                  <ul className="mt-4 space-y-3">
                    {col.links.map((l) => (
                      <li key={l.href + l.label}>
                        <Link
                          href={l.href}
                          className="text-sm text-neutral-600 transition-colors duration-200 hover:text-neutral-950"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col items-stretch gap-6 border-t border-neutral-100 pt-8 md:flex-row md:items-center md:justify-between md:gap-8 md:pt-10">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <GlobeIcon className="shrink-0 text-neutral-400" />
              <span>{localeLabel}</span>
            </div>
            <p className="text-center text-xs leading-relaxed text-neutral-400 md:flex-1 md:px-4">{bottomTagline}</p>
            <div className="hidden w-24 shrink-0 md:block" aria-hidden />
          </div>
        </div>
      </div>
    </footer>
  );
}
