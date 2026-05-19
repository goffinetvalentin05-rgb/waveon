"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";

const ITEMS = [
  {
    q: "Est-ce une application de paris ?",
    a: "Non. Prono Clash est un jeu de pronostics entre amis. Il n'y a aucune mise d'argent entre joueurs, ni gain d'argent. Le seul lot existant (le concours gratuit) est un objet physique offert.",
  },
  {
    q: "Faut-il payer pour participer au concours ?",
    a: "Non. Le concours est 100% gratuit, il suffit de ton email et de tes prédictions (champion + meilleur buteur). Aucun achat n'augmente tes chances de gagner.",
  },
  {
    q: "Peut-on créer une ligue gratuitement ?",
    a: "Non. La création d'une ligue privée est payante (paiement unique). Mais tu peux rejoindre la ligue publique globale gratuitement pour pronostiquer et apparaître au classement.",
  },
  {
    q: "Le paiement sert à quoi exactement ?",
    a: "À créer une ligue privée et à débloquer le mode jeu avec cartes (Joker x2, Vol de score, etc.). Le paiement n'augmente jamais tes chances au concours et ne donne aucun avantage compétitif au classement global.",
  },
  {
    q: "Êtes-vous affiliés à la FIFA ou à la Coupe du Monde ?",
    a: "Non. Aucune affiliation officielle. Les noms d'équipes et de joueurs sont utilisés à titre purement éditorial, et les marques restent la propriété de leurs détenteurs.",
  },
  {
    q: "Je peux modifier mes prédictions ?",
    a: "Tu peux modifier tes prédictions champion + meilleur buteur jusqu'à une deadline (fixée avant le début du tournoi). Pour chaque match, tu peux modifier ton pronostic jusqu'au coup d'envoi.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className={`${ui.section}`}>
      <div className={ui.container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">FAQ</p>
          <h2 className={`${ui.h2} mt-3`}>Toutes les bonnes questions.</h2>
        </div>
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
          {ITEMS.map((it, i) => (
            <FaqItem key={i} q={it.q} a={it.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-white transition hover:text-blue-200 sm:px-6 sm:py-5"
      >
        <span>{q}</span>
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 transition ${
            open ? "rotate-45 bg-white/10" : ""
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="px-5 pb-5 text-sm leading-relaxed text-white/65 sm:px-6">{a}</div>
      ) : null}
    </div>
  );
}
