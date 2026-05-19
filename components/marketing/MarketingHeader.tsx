"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ui } from "@/lib/design/tokens";

const NAV = [
  { label: "Comment ça marche", href: "#comment" },
  { label: "Cartes", href: "#cartes" },
  { label: "Concours", href: "#concours" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/30 backdrop-blur-xl">
      <div
        className={`${ui.container} flex h-16 items-center justify-between gap-4`}
      >
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className={ui.btnGhost}>
            Connexion
          </Link>
          <Link href="/signup" className={ui.btnPrimary}>
            Créer mon compte
          </Link>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white lg:hidden"
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
        <div className="border-t border-white/5 bg-black/70 backdrop-blur-xl lg:hidden">
          <div className={`${ui.container} flex flex-col gap-1 py-3`}>
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2 px-3 pb-1">
              <Link href="/login" className={`${ui.btnSecondary} flex-1`}>
                Connexion
              </Link>
              <Link href="/signup" className={`${ui.btnPrimary} flex-1`}>
                S'inscrire
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
