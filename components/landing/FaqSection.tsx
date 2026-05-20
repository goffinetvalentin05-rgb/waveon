"use client";

import { useState } from "react";
import { IconHelpCircle } from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";

const ITEMS = [
  {
    q: "Est-ce une app de paris ?",
    a: `Non. ${brand.name} est un jeu de pronostics entre potes. Il n'y a aucun pari d'argent entre joueurs ni gain d'argent direct.`,
  },
  {
    q: "Faut-il payer pour jouer ?",
    a: "Non. La ligue générale est gratuite : tu t'inscris, tu pronostiques et tu participes au concours global.",
  },
  {
    q: "À quoi sert le paiement ?",
    a: "À créer une ligue privée avec cartes d'attaque, classement privé et invitation WhatsApp. Un pack = une ligue.",
  },
  {
    q: "Peut-on rejoindre une ligue privée gratuitement ?",
    a: "Oui, si quelqu'un t'invite par lien. Seule la création de ligue privée est payante.",
  },
  {
    q: "Les cartes influencent-elles le concours global ?",
    a: "Non. Les cartes (Joker, Vol de score, VAR…) n'agissent que dans les ligues privées, jamais sur le classement général.",
  },
  {
    q: "Qu'est-ce qu'on peut gagner ?",
    a: "Le 1er du classement général peut tenter de remporter un maillot de football si 10 ligues privées ont été créées sur Waevon. Maillot soumis à disponibilité, sans échange en argent. Voir le règlement du concours.",
  },
];

export function FaqSection() {
  return (
    <SectionShell id="faq">
      <Reveal>
        <SectionTitle
          line1="Questions"
          line2Accent="fréquentes"
          icon={IconHelpCircle}
        />
      </Reveal>
      <Reveal delayMs={100}>
        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {ITEMS.map((it, i) => (
            <FaqItem key={i} q={it.q} a={it.a} />
          ))}
        </div>
      </Reveal>
    </SectionShell>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`pc-glass-card transition-[border-color,box-shadow] duration-300 ${
        open ? "!border-violet-500/30 shadow-[0_0_40px_rgba(168,85,247,0.2)]" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-white sm:px-6 sm:py-5"
      >
        <span>{q}</span>
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform duration-300 ${
            open ? "rotate-45 border-violet-500/30 bg-violet-500/15" : ""
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="px-5 pb-5 text-sm leading-relaxed text-[var(--pc-muted)] sm:px-6">{a}</div>
      ) : null}
    </div>
  );
}
