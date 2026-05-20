"use client";

import { useState } from "react";
import { IconHelpCircle } from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
const ITEMS = [
  {
    q: "Est-ce une application de paris ?",
    a: `Non. ${brand.name} est un jeu de pronostics entre potes. Il n'y a aucune mise d'argent entre joueurs ni gain d'argent. Le seul lot existant (concours gratuit) est un objet physique offert.`,
  },
  {
    q: "Faut-il payer pour participer au concours global ?",
    a: "Non. Le concours est 100% gratuit. Il te suffit de t'inscrire et de pronostiquer les matchs de la ligue générale.",
  },
  {
    q: "Peut-on gagner le concours sans payer ?",
    a: "Oui. Le gagnant est le premier du classement général à la fin du tournoi. Aucun achat n'augmente tes chances.",
  },
  {
    q: "À quoi sert le paiement, alors ?",
    a: "À créer une ligue privée et débloquer le mode jeu avec cartes : Joker x2, Vol de score, Carton rouge, Tacle, VAR. Ces cartes n'influencent pas le concours global.",
  },
  {
    q: "Peut-on rejoindre une ligue privée gratuitement ?",
    a: "Oui. Seule la création est payante. Si un pote a créé une ligue, il peut t'inviter par lien WhatsApp.",
  },
  {
    q: "Peut-on créer une ligue gratuitement ?",
    a: "Non pour une ligue privée. Tu peux toujours jouer dans la ligue générale, gratuite et ouverte à tous.",
  },
  {
    q: "Je peux modifier mes pronostics ?",
    a: "Oui, jusqu'au coup d'envoi du match. Après, ton pronostic est verrouillé.",
  },
  {
    q: "Êtes-vous affiliés à la FIFA ou aux fédérations ?",
    a: "Non. Aucune affiliation officielle avec la FIFA, la Coupe du Monde, les fédérations, les équipes ou les marques sportives.",
  },
];

export function FaqSection() {
  return (
    <SectionShell id="faq">
      <Reveal>
        <SectionTitle
          line1="Toutes les bonnes"
          line2Before=""
          line2After=" questions."
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
        open
          ? "!border-blue-500/30 shadow-[0_0_60px_rgba(59,130,246,0.2),inset_0_0_40px_rgba(59,130,246,0.1)]"
          : ""
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
            open ? "rotate-45 border-blue-500/30 bg-blue-500/15" : ""
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="px-5 pb-5 text-sm leading-relaxed text-[#9ca3af] sm:px-6">{a}</div>
      ) : null}
    </div>
  );
}
