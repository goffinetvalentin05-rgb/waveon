import Link from "next/link";
import { LEAGUE_PLANS } from "@/lib/stripe/config";
import { ui } from "@/lib/design/tokens";

const FREE_FEATURES = [
  "Participation au concours global gratuit",
  "Ligue publique (classement global)",
  "Pronostics classiques sur tous les matchs",
  "Classement en temps réel",
];

export function PricingSection() {
  return (
    <section id="tarifs" className={`${ui.section}`}>
      <div className={ui.container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Tarifs
          </p>
          <h2 className={`${ui.h2} mt-3`}>Gratuit pour jouer. Premium pour saboter.</h2>
          <p className="mt-4 text-base text-white/60">
            Le concours et les pronostics sont gratuits. Le paiement débloque
            uniquement la création d&apos;une ligue privée et les cartes spéciales.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <PricingCard
            tag="Gratuit"
            name="Joueur"
            price="0"
            unit="CHF"
            description="Pour tester, participer au concours et rejoindre la ligue globale."
            features={FREE_FEATURES}
            cta={{ label: "Créer mon compte", href: "/signup" }}
          />
          {Object.values(LEAGUE_PLANS).map((p) => (
            <PricingCard
              key={p.id}
              tag={p.highlight ? "Recommandé" : "Premium"}
              highlight={p.highlight}
              name={p.name}
              price={p.priceChf.toFixed(2).replace(".00", ".-")}
              unit="CHF"
              description={
                p.id === "private"
                  ? "Pour ton groupe d'amis. Cartes et chambrage inclus."
                  : "Pour ton bureau / ta famille élargie. Tout débloqué."
              }
              features={[`Jusqu'à ${p.maxPlayers} joueurs`, ...p.features.slice(1)]}
              cta={{
                label: "Créer ma ligue",
                href: `/leagues/new?plan=${p.id}`,
              }}
            />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-white/40">
          Paiement unique via Stripe · pas d&apos;abonnement · pas de mise d&apos;argent entre joueurs.
        </p>
      </div>
    </section>
  );
}

function PricingCard({
  tag,
  name,
  price,
  unit,
  description,
  features,
  cta,
  highlight = false,
}: {
  tag: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
}) {
  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-7 backdrop-blur-xl ${
        highlight
          ? "border-violet-400/40 bg-gradient-to-b from-violet-500/15 to-blue-500/5 shadow-[0_25px_60px_-20px_rgba(168,85,247,0.45)]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            highlight
              ? "bg-gradient-to-r from-violet-400 to-fuchsia-400 text-black"
              : "bg-white/10 text-white/70"
          }`}
        >
          {tag}
        </span>
      </div>
      <h3 className="mt-5 font-display text-2xl font-semibold text-white">{name}</h3>
      <p className="mt-2 min-h-[3rem] text-sm text-white/55">{description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-5xl font-bold text-white">{price}</span>
        <span className="text-sm text-white/40">{unit}</span>
      </div>
      <ul className="mt-6 space-y-2.5 text-sm text-white/75">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`mt-8 ${highlight ? ui.btnPrimary : ui.btnSecondary} w-full justify-center`}
      >
        {cta.label}
      </Link>
    </article>
  );
}
