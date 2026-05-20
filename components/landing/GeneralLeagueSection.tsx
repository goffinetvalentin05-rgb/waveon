import Link from "next/link";
import type { ReactNode } from "react";
import { IconTrophy } from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

export function GeneralLeagueSection() {
  return (
    <SectionShell id="ligue-generale" halo="orange">
      <Reveal>
        <SectionTitle
          line1="Ligue générale gratuite"
          line2After=" pour tous"
          icon={IconTrophy}
          subtitle="Tous les utilisateurs inscrits participent au même concours."
        />
      </Reveal>
      <Reveal delayMs={100}>
        <div className="pc-glass-card mt-14 overflow-hidden p-8 sm:p-12 lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className={landing.badge}>
                <span className="pc-lp-eyebrow-dot" />
                Concours gratuit
              </span>
              <p className={`${landing.body} mt-6`}>
                Tout le monde commence dans la ligue générale. Fais tes pronos, marque des points
                et tente de finir numéro 1.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[var(--pc-muted)]">
                <Bullet>Pronostics classiques sur tous les matchs</Bullet>
                <Bullet>Classement général en temps réel</Bullet>
                <Bullet>Concours gratuit — lot pour le premier</Bullet>
                <Bullet>Les cartes n&apos;influencent pas ce classement</Bullet>
              </ul>
              <Link href="/signup" className={`${landing.btnPrimary} mt-8`}>
                Rejoindre gratuitement
              </Link>
            </div>
            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-8 rounded-full blur-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(251,191,36,0.2) 0%, rgba(168,85,247,0.15) 45%, transparent 70%)",
                }}
                aria-hidden
              />
              <div className={`${landing.glass} relative mx-auto max-w-sm p-6`}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#a5b4fc]">
                  Classement général
                </p>
                <RankLine rank={1} label="CapitaineDuGroupe" pts={342} highlight />
                <RankLine rank={2} label="Maxou" pts={329} />
                <RankLine rank={3} label="LucaB" pts={318} />
                <div className="mt-5 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-violet-500/10 p-4 text-center">
                  <p className="text-[11px] uppercase tracking-widest text-amber-200/90">
                    Lot · 1er du classement
                  </p>
                  <p className="mt-1 font-[family-name:var(--pc-font-display)] text-lg font-semibold text-white">
                    Maillot ou bon équivalent
                  </p>
                  <p className="text-sm text-amber-200/80">jusqu&apos;à CHF 120</p>
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
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
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
          : "border-white/[0.06] bg-black/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
            rank === 1
              ? "bg-amber-400 text-black"
              : rank === 2
                ? "bg-slate-300 text-black"
                : "bg-amber-900/80 text-white"
          }`}
        >
          {rank}
        </span>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-bold text-indigo-200">
        {pts} pts
      </span>
    </div>
  );
}
