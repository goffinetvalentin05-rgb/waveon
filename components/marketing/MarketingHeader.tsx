"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { landing } from "@/components/landing/landing-styles";

const NAV = [
  { label: "Pourquoi", href: "#pourquoi" },
  { label: "Concours", href: "#concours" },
  { label: "Comment ça marche", href: "#comment" },
  { label: "Cartes", href: "#cartes" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#05060a]/60 backdrop-blur-[20px]">
      <div className={`${landing.container} flex h-16 items-center justify-between gap-4`}>
        <Logo />
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-[#9ca3af] transition hover:text-white"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-[#9ca3af] transition hover:text-white"
          >
            Connexion
          </Link>
          <Link href="/signup" className={landing.btnPrimary}>
            Créer mon compte
          </Link>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>
      {open ? (
        <div className="border-t border-white/[0.06] bg-[#05060a]/90 backdrop-blur-[20px] lg:hidden">
          <div className={`${landing.container} flex flex-col gap-1 py-3`}>
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-[#9ca3af] hover:bg-white/[0.04] hover:text-white"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2 px-3 pb-1">
              <Link href="/login" className={`${landing.btnSecondary} flex-1`}>
                Connexion
              </Link>
              <Link href="/signup" className={`${landing.btnPrimary} flex-1`}>
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
