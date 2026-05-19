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
                Devine le champion. Devine le buteur. Gagne un maillot.
              </h2>
              <p className="mt-5 text-base text-white/70">
                Tente de remporter un maillot de football au choix d'une valeur
                maximale de <span className="font-semibold text-white">CHF 120</span>.
                Participation 100% gratuite, juste avec ton email.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-white/75">
                <BulletCheck>Choisis ton champion du tournoi</BulletCheck>
                <BulletCheck>Choisis le meilleur buteur</BulletCheck>
                <BulletCheck>Verrouille avant la deadline</BulletCheck>
                <BulletCheck>Tirage au sort entre les bonnes réponses</BulletCheck>
              </ul>
              <Link href="/signup?next=contest" className={`${ui.btnPrimary} mt-8`}>
                Participer gratuitement
              </Link>
              <p className="mt-3 text-xs text-white/40">
                Aucun pari d'argent. Aucune affiliation FIFA / Coupe du Monde.
              </p>
            </div>
            <div className="relative">
              <div className="mx-auto max-w-sm rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Ton pari</span>
                  <span>Gratuit</span>
                </div>
                <PredictionLine
                  label="Champion"
                  value="Équipe bleue"
                  emoji="trophy"
                />
                <PredictionLine
                  label="Meilleur buteur"
                  value="Numéro 9"
                  emoji="boot"
                />
                <div className="mt-5 rounded-xl border border-amber-300/30 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-4 text-center">
                  <div className="text-[11px] uppercase tracking-widest text-amber-200/80">
                    Lot
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold text-white">
                    Maillot football
                  </div>
                  <div className="text-sm text-white/70">jusqu'à CHF 120</div>
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

function PredictionLine({ label, value, emoji }: { label: string; value: string; emoji: "trophy" | "boot" }) {
  return (
    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-violet-500/30 text-white">
          {emoji === "trophy" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 21h8v-2h-3v-3.07A7 7 0 0 0 19 9V5h-2V3H7v2H5v4a7 7 0 0 0 6 6.93V19H8Z"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17h14a4 4 0 0 0 4-4V8H7v4l-4 1z"/></svg>
          )}
        </span>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
          <div className="text-sm font-semibold text-white">{value}</div>
        </div>
      </div>
      <span className="text-xs text-white/40">À choisir</span>
    </div>
  );
}
