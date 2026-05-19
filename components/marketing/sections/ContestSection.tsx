import Link from "next/link";
import { ui } from "@/lib/design/tokens";

export function ContestSection() {
  return (
    <section id="concours" className={`${ui.section} relative overflow-hidden`}>
      <div className={ui.container}>
        <div className={`${ui.glowCard} relative overflow-hidden p-8 sm:p-12 lg:p-16`}>
          <div className="pc-aurora opacity-60" />
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className={ui.badgeAccent}>
                Concours gratuit · sans achat requis
              </span>
              <h2 className={`${ui.h2} mt-4`}>
                Termine premier du classement. Gagne un maillot.
              </h2>
              <p className="mt-5 text-base text-white/70">
                Tout le monde joue dans la même ligue générale. Termine premier à la fin
                du tournoi mondial 2026 pour gagner un maillot de football ou un bon
                équivalent d&apos;une valeur maximale de{" "}
                <span className="font-semibold text-white">CHF 120</span>.
                Participation 100% gratuite.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-white/75">
                <BulletCheck>Pronostics classiques sur tous les matchs</BulletCheck>
                <BulletCheck>Classement général en temps réel</BulletCheck>
                <BulletCheck>
                  Tie-break : scores exacts &gt; bons vainqueurs &gt; nombre de pronos
                </BulletCheck>
                <BulletCheck>
                  Payer une ligue privée n&apos;augmente PAS les chances de gagner
                </BulletCheck>
              </ul>
              <Link href="/signup" className={`${ui.btnPrimary} mt-8`}>
                Rejoindre la ligue gratuite
              </Link>
              <p className="mt-3 text-xs text-white/40">
                Aucun pari d&apos;argent. Aucune affiliation FIFA, Coupe du Monde, fédérations
                ou marques sportives.
              </p>
            </div>
            <div className="relative">
              <div className="mx-auto max-w-sm rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Classement final</span>
                  <span>Tournoi mondial 2026</span>
                </div>
                <RankLine rank={1} label="ValentinKing" pts={342} highlight />
                <RankLine rank={2} label="Maxou" pts={329} />
                <RankLine rank={3} label="LucaB" pts={318} />
                <div className="mt-5 rounded-xl border border-amber-300/30 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-4 text-center">
                  <div className="text-[11px] uppercase tracking-widest text-amber-200/80">
                    Lot pour le n°1
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold text-white">
                    Maillot ou bon équivalent
                  </div>
                  <div className="text-sm text-white/70">jusqu&apos;à CHF 120</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BulletCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
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
          ? "border-amber-300/30 bg-amber-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${
            rank === 1
              ? "bg-yellow-400 text-black"
              : rank === 2
                ? "bg-slate-300 text-black"
                : "bg-amber-700 text-white"
          }`}
        >
          {rank}
        </span>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white">
        {pts} pts
      </span>
    </div>
  );
}
