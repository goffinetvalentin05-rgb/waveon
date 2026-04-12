"use client";

import Link from "next/link";
import { useRef } from "react";
import type { LandingContent } from "@/lib/landing/config";
import { BrandLogoLink } from "./BrandLogoLink";

type LandingHeaderProps = {
  brand: LandingContent["brand"];
  header: LandingContent["header"];
};

export function LandingHeader({ brand, header }: LandingHeaderProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => menuRef.current?.removeAttribute("open");

  const navLinks = header.navLinks;
  const hasNav = navLinks.length > 0;

  return (
    <header className="sticky top-0 z-50 px-4 pt-2.5 md:px-6 md:pt-3">
      <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-neutral-200/90 bg-white/85 px-3 py-1.5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] backdrop-blur-md md:gap-4 md:px-4 md:py-2">
        <BrandLogoLink brand={brand} variant="header" />

        <nav
          className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2"
          aria-label="Navigation"
        >
          {hasNav ? (
            <div className="hidden items-center md:flex md:gap-0.5">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={header.login.href}
                className="ml-1 rounded-lg px-2.5 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100/80 hover:text-neutral-950"
              >
                {header.login.label}
              </Link>
            </div>
          ) : null}

          {hasNav ? (
            <>
              <Link
                href={header.login.href}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-neutral-600 transition hover:bg-neutral-100/80 hover:text-neutral-950 sm:text-xs md:hidden"
              >
                {header.login.label}
              </Link>
              <details ref={menuRef} className="relative md:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-neutral-200/90 bg-white p-2 text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 [&::-webkit-details-marker]:hidden">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  <span className="sr-only">Ouvrir le menu</span>
                </summary>
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 rounded-xl border border-neutral-200/90 bg-white p-1.5 shadow-lg">
                  {navLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className="block rounded-lg px-3 py-2.5 text-sm text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            </>
          ) : (
            <Link
              href={header.login.href}
              className="rounded-lg px-2 py-1.5 text-xs text-neutral-600 transition hover:bg-neutral-100/80 hover:text-neutral-950 sm:px-2.5 sm:text-sm"
            >
              {header.login.label}
            </Link>
          )}

          <Link
            href={header.cta.href}
            onClick={closeMenu}
            className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-neutral-800 sm:px-4 sm:text-xs md:min-h-9 md:px-5 md:text-sm"
          >
            {header.cta.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
