import Link from "next/link";
import { LEAGUE_PLANS } from "@/lib/stripe/config";
import { ui } from "@/lib/design/tokens";

const FREE_FEATURES = [
  "Rejoindre la ligue générale",
  "Participer au concours global",
  "Pronostics classiques",
  "Classement général",
  "Rejoindre une ligue privée via invitation",
  "Création de ligue privée non incluse",
];

export function PricingSection() {
  return (
    <section id="tarifs" className={ui.section}>
      <div className={ui.container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Tarifs
          </p>
          <h2 className={`${ui.h2} mt-3`}>Gratuit pour jouer. Premium pour saboter.</h2>
          <p className="mt-4 text-base text-white/60">
            Le concours et la ligue générale sont gratuits. Le paiement débloque uniquement la
            création d&apos;une ligue privée — un pack = une ligue.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <PricingCard
            tag="Gratuit"
            name="Joueur"
            price="0"
            unit="CHF"
            perUnit=""
            description="Pour la ligue générale et le concours global."
            features={FREE_FEATURES}
            cta={{ label: "Rejoindre la ligue gratuite", href: "/signup" }}
          />
          <PricingCard
            tag="Premium"
            name={LEAGUE_PLANS.private.name}
            price={LEAGUE_PLANS.private.priceChf.toFixed(2).replace(".00", ".-")}
            unit="CHF"
            perUnit="/ ligue"
            description="Crée exactement une ligue privée."
            features={[
              "Crée 1 ligue privée",
              "Jusqu'à 20 joueurs",
              "Cartes spéciales",
              "Classement privé",
              "Invitation WhatsApp",
            ]}
            cta={{ label: "Créer ma ligue", href: "/leagues/new?plan=private" }}
          />
          <PricingCard
            tag="Recommandé"
            highlight
            name={LEAGUE_PLANS.pro.name}
            price={LEAGUE_PLANS.pro.priceChf.toFixed(2).replace(".00", ".-")}
            unit="CHF"
            perUnit="/ ligue"
            description="Pour les gros groupes WhatsApp."
            features={[
              "Crée 1 ligue privée",
              "Jusqu'à 50 joueurs",
              "Toutes les cartes",
              "Résumés fun",
              "Badges & visuels partageables (bientôt)",
            ]}
            cta={{ label: "Créer ma ligue Pro", href: "/leagues/new?plan=pro" }}
          />
        </div>
        <p className="mt-8 text-center text-sm text-white/50">
          Chaque pack permet de créer <strong className="text-white/80">une seule</strong> ligue
          privée. Pour créer une autre ligue, il faut acheter un nouveau pack.
        </p>
        <p className="mt-2 text-center text-xs text-white/40">
          Paiement unique via Stripe · pas d&apos;abonnement · pas de mise d&apos;argent entre joueurs.
          Le paiement n&apos;augmente pas tes chances au concours global.
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
  perUnit,
  description,
  features,
  cta,
  highlight = false,
}: {
  tag: string;
  name: string;
  price: string;
  unit: string;
  perUnit: string;
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
      <span
        className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
          highlight
            ? "bg-gradient-to-r from-violet-400 to-fuchsia-400 text-black"
            : "bg-white/10 text-white/70"
        }`}
      >
        {tag}
      </span>
      <h3 className="mt-5 font-display text-2xl font-semibold text-white">{name}</h3>
      <p className="mt-2 min-h-[3rem] text-sm text-white/55">{description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-5xl font-bold text-white">{price}</span>
        <span className="text-sm text-white/40">
          {unit}
          {perUnit}
        </span>
      </div>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm text-white/75">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="mt-0.5 text-emerald-400">✓</span>
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
