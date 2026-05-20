"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { landing } from "@/components/landing/landing-styles";

const NAV = [
  { label: "Comment ça marche", href: "#comment" },
  { label: "Ligue générale", href: "#ligue-generale" },
  { label: "Ligues privées", href: "#ligues-privees" },
  { label: "Cartes", href: "#cartes" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="pc-header-glass sticky top-0 z-40">
      <div className={`${landing.container} flex h-16 items-center justify-between gap-4`}>
        <Logo />
        <nav className="hidden items-center gap-5 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-[var(--pc-muted)] transition hover:text-white"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-[var(--pc-muted)] transition hover:text-white"
          >
            Connexion
          </Link>
          <Link href="/signup" className={landing.btnPrimary}>
            Créer mon compte
          </Link>
        </div>
        <button
          type="button"
          className="pc-icon-btn sm lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <>
                <path d="M4 7h16" strokeLinecap="round" />
                <path d="M4 12h16" strokeLinecap="round" />
                <path d="M4 17h16" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>
      {open ? (
        <div className="border-t border-white/[0.06] bg-[#050505]/95 backdrop-blur-xl lg:hidden">
          <div className={`${landing.container} flex flex-col gap-1 py-3`}>
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm text-[var(--pc-muted)] hover:bg-white/[0.04] hover:text-white"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2 px-1 pb-1">
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
