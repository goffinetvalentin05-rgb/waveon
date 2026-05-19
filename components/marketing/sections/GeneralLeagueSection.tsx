import Link from "next/link";
import { ui } from "@/lib/design/tokens";

export function GeneralLeagueSection() {
  return (
    <section id="ligue-generale" className={ui.section}>
      <div className={ui.container}>
          <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
              100% gratuit
            </p>
            <h2 className={`${ui.h2} mt-3`}>La ligue générale, ouverte à tous.</h2>
            <p className="mt-5 text-base leading-relaxed text-white/70">
              Tout le monde joue dans la même ligue générale. Fais tes pronostics, marque des
              points et tente de finir numéro 1 du classement mondial.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-white/75">
              <Bullet>Inscription gratuite — tu y es ajouté automatiquement</Bullet>
              <Bullet>Pronostics classiques sur chaque match</Bullet>
              <Bullet>Classement général public pour tous les inscrits</Bullet>
              <Bullet>Concours gratuit : le n°1 remporte le lot</Bullet>
              <Bullet>Pas de cartes, pas de sabotage — fair-play total</Bullet>
            </ul>
            <Link href="/signup" className={`${ui.btnPrimary} mt-8`}>
              Rejoindre la ligue gratuite
            </Link>
          </div>
          <div className={`${ui.glassCard} p-6 sm:p-8`}>
            <p className="text-xs uppercase tracking-widest text-white/45">Classement en direct</p>
            <div className="mt-4 space-y-2">
              <RankLine n={1} name="Toi bientôt ?" pts="—" highlight />
              <RankLine n={2} name="Joueur 2" pts={287} />
              <RankLine n={3} name="Joueur 3" pts={271} />
            </div>
            <p className="mt-5 text-center text-xs text-white/40">
              Les cartes et sabotages sont réservés aux ligues privées.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
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
  n,
  name,
  pts,
  highlight,
}: {
  n: number;
  name: string;
  pts: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        highlight
          ? "border-emerald-400/30 bg-emerald-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-white">
          {n}
        </span>
        <span className="text-sm font-semibold text-white">{name}</span>
      </div>
      <span className="text-xs font-bold text-white/80">
        {typeof pts === "number" ? `${pts} pts` : pts}
      </span>
    </div>
  );
}
