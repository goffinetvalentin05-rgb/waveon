"use client";

import { useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/context";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/i18n/types";

export function LanguageSelector() {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSelect = (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Choisir la langue"
      >
        <span aria-hidden>{LOCALE_LABELS[locale]}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 top-full z-20 mt-1.5 min-w-[4.5rem] rounded-xl border border-white/10 bg-[#111224]/95 py-1 shadow-xl backdrop-blur"
          >
            {SUPPORTED_LOCALES.map((loc) => (
              <li key={loc} role="option" aria-selected={locale === loc}>
                <button
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className={`block w-full px-4 py-2 text-left text-sm transition ${
                    locale === loc
                      ? "bg-white/10 font-semibold text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
