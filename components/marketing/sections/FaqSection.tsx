"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";

const ITEMS = [
  {
    q: "Est-ce une application de paris ?",
    a: "Non. Prono Clash est un jeu de pronostics entre potes. Il n'y a aucune mise d'argent entre joueurs ni gain d'argent. Le seul lot existant (concours gratuit) est un objet physique offert.",
  },
  {
    q: "Faut-il payer pour participer au concours global ?",
    a: "Non. Le concours est 100% gratuit. Il te suffit de t'inscrire et de pronostiquer les matchs de la ligue générale.",
  },
  {
    q: "Peut-on gagner le concours sans payer ?",
    a: "Oui. Le gagnant est tout simplement le premier du classement général à la fin du tournoi. Aucun achat n'augmente tes chances.",
  },
  {
    q: "À quoi sert le paiement, alors ?",
    a: "À créer une ligue privée et débloquer le mode jeu avec cartes : Joker x2, Vol de score, Carton rouge, Tacle, VAR. Tu joues ces cartes uniquement dans ta ligue privée, et elles n'influencent pas le classement général ni le concours.",
  },
  {
    q: "Peut-on rejoindre une ligue privée gratuitement ?",
    a: "Oui. Seule la création est payante. Si un pote a créé une ligue, il peut t'inviter par lien WhatsApp et tu y entres gratuitement.",
  },
  {
    q: "Peut-on créer une ligue gratuitement ?",
    a: "Non. La création d'une ligue privée est premium. Mais tu peux toujours jouer dans la ligue générale, qui est gratuite et ouverte à tous.",
  },
  {
    q: "Je peux modifier mes pronostics ?",
    a: "Oui, jusqu'au coup d'envoi du match. Après le coup d'envoi, ton pronostic est verrouillé.",
  },
  {
    q: "Êtes-vous affiliés à la FIFA ou aux fédérations ?",
    a: "Non. Aucune affiliation officielle avec la FIFA, la Coupe du Monde, les fédérations, les équipes ou les marques sportives. Les marques citées restent la propriété de leurs détenteurs.",
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
