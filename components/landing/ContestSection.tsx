import Link from "next/link";
import type { ReactNode } from "react";
import { IconTrophy } from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

export function ContestSection() {
  return (
    <SectionShell id="concours" halo="gold-blue">
      <Reveal>
        <SectionTitle
          line1="Termine premier de la ligue générale"
          line2Accent="et tente de remporter un maillot"
          icon={IconTrophy}
          subtitle="Concours 100 % gratuit — sans achat requis."
        />
      </Reveal>
      <Reveal delayMs={100}>
        <div className="pc-bento-card mt-16 overflow-hidden !min-h-0 p-8 sm:p-12 lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className={landing.badge}>Concours gratuit · sans achat requis</span>
              <p className="mt-5 text-sm leading-relaxed text-[#9ca3af] sm:text-base">
                Tout le monde joue dans la même ligue générale. Grimpe au classement général,
                fais tes pronos et tente de gagner le maillot de ton choix à la fin du tournoi
                mondial 2026.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-[#9ca3af]">
                <Bullet>Pronostics classiques sur tous les matchs</Bullet>
                <Bullet>Classement général en temps réel</Bullet>
                <Bullet>Tie-break : scores exacts, bons vainqueurs, volume de pronos</Bullet>
                <Bullet>Payer une ligue privée n&apos;augmente pas tes chances</Bullet>
              </ul>
              <Link href="/signup" className={`${landing.btnPrimary} mt-8`}>
                Rejoindre la ligue gratuite
              </Link>
              <p className="mt-3 text-xs text-[#9ca3af]/80">
                Aucun pari d&apos;argent. Jeu indépendant, sans affiliation officielle avec une
                compétition ou une marque sportive.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.25)_0%,rgba(59,130,246,0.15)_45%,transparent_70%)] blur-2xl" />
              <div className={`${landing.glass} relative mx-auto max-w-sm p-6`}>
                <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                  <span>Classement final</span>
                  <span>Tournoi mondial 2026</span>
                </div>
                <RankLine rank={1} label="CapitaineDuGroupe" pts={342} highlight />
                <RankLine rank={2} label="Maxou" pts={329} />
                <RankLine rank={3} label="LucaB" pts={318} />
                <div className="mt-5 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-blue-500/10 p-4 text-center shadow-[inset_0_0_40px_rgba(251,191,36,0.08)]">
                  <p className="text-[11px] uppercase tracking-widest text-amber-200/90">Lot pour le n°1</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-white">
                    Un maillot à gagner
                  </p>
                  <p className="text-sm text-amber-200/80">Tente de gagner le maillot de ton choix</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

function RankLine({
  rank,
  label,
  pts,
  highlight,
}: {
  rank: number;
  label: string;
  pts: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`mt-3 flex items-center justify-between rounded-xl border px-4 py-3 ${
        highlight
          ? "border-amber-400/35 bg-amber-500/10"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${
            rank === 1
              ? "bg-amber-400 text-black"
              : rank === 2
                ? "bg-slate-300 text-black"
                : "bg-amber-800 text-white"
          }`}
        >
          {rank}
        </span>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      <span className="rounded bg-blue-500/15 px-2 py-0.5 text-xs font-bold text-blue-300">
        {pts} pts
      </span>
    </div>
  );
}
