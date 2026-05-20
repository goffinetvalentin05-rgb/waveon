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
    <SectionShell id="tarifs" halo="pricing">
      <Reveal>
        <SectionTitle
          line1="Choisis ton pack"
          line2Before=""
          line2After=" maintenant"
          icon={IconClock}
          subtitle="Gratuit pour jouer · premium pour créer ta ligue privée — un pack = une ligue."
        />
      </Reveal>

      <div className="relative mt-16">
        <div className="pc-pricing-glow-behind hidden lg:block" aria-hidden />
        <div className="relative z-[1] flex flex-col items-stretch gap-6 lg:flex-row lg:items-stretch lg:justify-center">
          <Reveal delayMs={0} className="w-full lg:max-w-[300px] lg:flex-1">
            <PricingCard
              tag="Gratuit"
              name="Joueur"
              price="0"
              unit="CHF"
              perUnit=""
              description="Ligue générale et concours global."
              features={FREE_FEATURES}
              cta={{ label: "Rejoindre gratuitement", href: "/signup" }}
            />
          </Reveal>
          <Reveal delayMs={100} className="w-full lg:max-w-[340px] lg:flex-[1.15]">
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
          <Reveal delayMs={200} className="w-full lg:max-w-[300px] lg:flex-1">
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
      </div>

      <p className="relative z-[1] mt-10 text-center text-sm text-[#9ca3af]">
        Chaque pack permet de créer <strong className="font-medium text-white/90">une seule</strong> ligue privée.
      </p>
      <p className="mt-2 text-center text-xs text-[#9ca3af]/75">
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
      className={`pc-pricing-card h-full ${highlight ? "pc-pricing-card-highlight lg:min-h-[520px] lg:-translate-y-3" : "lg:min-h-[480px]"}`}
    >
      <span
        className={`relative z-[1] w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
          highlight
            ? "bg-blue-500 text-white shadow-[0_4px_20px_rgba(59,130,246,0.5)]"
            : "border border-white/10 bg-white/[0.06] text-[#9ca3af]"
        }`}
      >
        {tag}
      </span>

      <h3 className="relative z-[1] mt-6 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-white">
        {name}
      </h3>
      <p className="relative z-[1] mt-2 text-sm text-[#9ca3af]">{description}</p>

      <div className="relative z-[1] mt-8 flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--font-display)] text-[3.25rem] font-bold leading-none tracking-[-0.03em] text-white">
          {price}
        </span>
        <span className="text-sm text-[#9ca3af]">
          {unit}
          {perUnit}
        </span>
      </div>

      <Link
        href={cta.href}
        className={`${landing.btnPrimary} relative z-[1] mt-6 w-full justify-center rounded-xl py-4`}
      >
        {cta.label}
      </Link>

      <ul className="relative z-[1] mt-8 flex-1 space-y-3 border-t border-white/[0.06] pt-6 text-sm text-[#9ca3af]">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
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
