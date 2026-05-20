import Link from "next/link";
import { IconLock, IconUsers } from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

export function PrivateLeaguesSection() {
  return (
    <SectionShell id="ligues-privees" halo="intense">
      <Reveal>
        <SectionTitle
          line1="Ligues privées"
          line2Accent="entre potes"
          subtitle="Chaque ligue privée a ses propres pronos, son classement et ses coups bas."
        />
      </Reveal>
      <Reveal delayMs={80}>
        <div className="mx-auto mt-6 max-w-2xl text-center">
          <p className={`${landing.body} center`}>
            Création payante · invitation WhatsApp · classement privé · cartes d&apos;attaque ·
            pronostics séparés de la ligue générale.
          </p>
        </div>
      </Reveal>
      <Reveal delayMs={140}>
        <div className="pc-lp-split-visual">
          <article className="pc-lp-league-preview general pc-glass-card">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg">
                LG
              </span>
              <div>
                <h3 className="font-[family-name:var(--pc-font-display)] text-lg font-bold text-white">
                  Ligue générale
                </h3>
                <span className="mt-2 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-0.5 text-[9px] font-bold uppercase text-indigo-200">
                  Générale · Gratuit
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--pc-muted)]">
              Pronos du concours global. Classement public. Pas de cartes de sabotage.
            </p>
            <p className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-center text-sm font-bold text-indigo-100">
              Prono : 2 – 1
            </p>
          </article>

          <article className="pc-lp-league-preview private pc-glass-card">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-900 text-sm font-bold text-white shadow-lg">
                LP
              </span>
              <div>
                <h3 className="font-[family-name:var(--pc-font-display)] text-lg font-bold text-white">
                  Ligue des potes
                </h3>
                <span className="mt-2 inline-block rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-[9px] font-bold uppercase text-purple-200">
                  Privée · Battle room
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--pc-muted)]">
              Pronos indépendants. Classement entre amis. Cartes Joker, Vol de score, VAR…
            </p>
            <p className="mt-3 rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-2 text-center text-sm font-bold text-purple-100">
              Prono : 1 – 1
            </p>
          </article>
        </div>

        <div className="pc-lp-prono-split max-w-xl mx-auto">
          <IconLock size={16} className="shrink-0 text-violet-400" stroke={1.8} />
          <span>Même match — pronos et points calculés séparément par ligue</span>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/signup?next=create-league" className={landing.btnPrimary}>
            Créer ma ligue
          </Link>
          <Link href="/leagues/join" className={landing.btnSecondary}>
            <IconUsers size={16} stroke={1.8} />
            J&apos;ai un code d&apos;invitation
          </Link>
        </div>
      </Reveal>
    </SectionShell>
  );
}
