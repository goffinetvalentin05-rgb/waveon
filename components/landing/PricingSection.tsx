import Link from "next/link";
import { IconClock } from "@tabler/icons-react";
import { LEAGUE_PLANS } from "@/lib/stripe/config";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

const FREE_FEATURES = [
  "Rejoindre la ligue générale",
  "Participer au concours global",
  "Pronostics classiques",
  "Classement général",
  "Rejoindre une ligue privée via invitation",
  "Création de ligue privée non incluse",
];

export function PricingSection() {
  const privatePrice = LEAGUE_PLANS.private.priceChf.toFixed(2).replace(".00", ".-");
  const proPrice = LEAGUE_PLANS.pro.priceChf.toFixed(2).replace(".00", ".-");

  return (
    <SectionShell id="tarifs" halo="intense">
      <Reveal>
        <SectionTitle
          line1="Choisis ton pack"
          line2Before=""
          line2After=" maintenant"
          icon={IconClock}
          subtitle="Gratuit pour jouer · premium pour créer ta ligue privée — un pack = une ligue."
        />
      </Reveal>
      <div className="mt-14 flex flex-col items-stretch gap-6 lg:flex-row lg:items-end lg:justify-center">
        <Reveal delayMs={0} className="w-full lg:max-w-[320px] lg:flex-1">
          <PricingCard
            tag="Gratuit"
            name="Joueur"
            price="0"
            unit="CHF"
            perUnit=""
            description="Ligue générale et concours global."
            features={FREE_FEATURES}
            cta={{ label: "Rejoindre la ligue gratuite", href: "/signup" }}
          />
        </Reveal>
        <Reveal delayMs={100} className="w-full lg:max-w-[360px] lg:flex-[1.12]">
          <PricingCard
            tag="Le plus populaire"
            name={LEAGUE_PLANS.private.name}
            price={privatePrice}
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
            highlight
          />
        </Reveal>
        <Reveal delayMs={200} className="w-full lg:max-w-[320px] lg:flex-1">
          <PricingCard
            tag="Premium"
            name={LEAGUE_PLANS.pro.name}
            price={proPrice}
            unit="CHF"
            perUnit="/ ligue"
            description="Pour les gros groupes WhatsApp."
            features={[
              "Crée 1 ligue privée",
              "Jusqu'à 50 joueurs",
              "Toutes les cartes",
              "Résumés fun",
              "Badges & visuels (bientôt)",
            ]}
            cta={{ label: "Créer ma ligue Pro", href: "/leagues/new?plan=pro" }}
          />
        </Reveal>
      </div>
      <p className="mt-8 text-center text-sm text-[#9ca3af]">
        Chaque pack permet de créer <strong className="text-white/90">une seule</strong> ligue privée.
      </p>
      <p className="mt-2 text-center text-xs text-[#9ca3af]/80">
        Paiement unique via Stripe · pas d&apos;abonnement · pas de mise entre joueurs.
      </p>
    </SectionShell>
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
      className={`relative flex flex-col rounded-[24px] border p-7 backdrop-blur-[20px] ${
        highlight
          ? "scale-[1.02] border-blue-500/35 bg-white/[0.05] shadow-[0_0_100px_rgba(59,130,246,0.35),inset_0_0_60px_rgba(59,130,246,0.12)] lg:py-10"
          : `${landing.glass} shadow-[inset_0_0_60px_rgba(59,130,246,0.08)]`
      }`}
    >
      {highlight ? (
        <div className="pointer-events-none absolute -inset-px rounded-[24px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.35)_0%,transparent_70%)]" />
      ) : null}
      <span
        className={`relative w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
          highlight ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" : "bg-white/10 text-[#9ca3af]"
        }`}
      >
        {tag}
      </span>
      <h3 className="relative mt-5 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
        {name}
      </h3>
      <p className="relative mt-2 min-h-[2.5rem] text-sm text-[#9ca3af]">{description}</p>
      <div className="relative mt-6 flex items-baseline gap-1">
        <span className="font-[family-name:var(--font-display)] text-5xl font-bold text-white">{price}</span>
        <span className="text-sm text-[#9ca3af]">
          {unit}
          {perUnit}
        </span>
      </div>
      <Link href={cta.href} className={`${landing.btnPrimary} relative mt-6 w-full justify-center`}>
        {cta.label}
      </Link>
      <ul className="relative mt-6 flex-1 space-y-2.5 text-sm text-[#9ca3af]">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="mt-0.5 text-blue-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {f}
          </li>
        ))}
      </ul>
    </article>
  );
}
