import Link from "next/link";
import { IconCreditCard } from "@tabler/icons-react";
import { LEAGUE_PLANS } from "@/lib/stripe/config";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

const FREE_FEATURES = [
  "Rejoins la ligue générale",
  "Participe au concours global",
  "Pronostics classiques",
  "Classement général",
  "Rejoins une ligue privée via invitation",
];

export function PricingSection() {
  const privatePrice = LEAGUE_PLANS.private.priceChf.toFixed(2);
  const proPrice = LEAGUE_PLANS.pro.priceChf.toFixed(2);

  return (
    <SectionShell id="tarifs" halo="pricing">
      <Reveal>
        <SectionTitle
          line1="Choisis ton pack"
          line2After=""
          icon={IconCreditCard}
          subtitle="Gratuit pour jouer · premium pour créer ta ligue privée — un pack = une ligue."
        />
      </Reveal>

      <div className="relative mt-14">
        <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
          <Reveal delayMs={0}>
            <PricingCard
              tag="Gratuit"
              name="Gratuit"
              price="0"
              unit="CHF"
              perUnit=""
              description="Ligue générale et concours global."
              features={FREE_FEATURES}
              cta={{ label: "Rejoindre gratuitement", href: "/signup" }}
            />
          </Reveal>
          <Reveal delayMs={80}>
            <PricingCard
              tag="Le plus populaire"
              name="Private League"
              price={privatePrice}
              unit="CHF"
              perUnit=" / ligue"
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
          <Reveal delayMs={160}>
            <PricingCard
              tag="Premium"
              name="Pro League"
              price={proPrice}
              unit="CHF"
              perUnit=" / ligue"
              description="Pour les gros groupes WhatsApp."
              features={[
                "Crée 1 ligue privée",
                "Jusqu'à 50 joueurs",
                "Toutes les cartes",
                "Résumés fun",
                "Badges / visuels partageables (bientôt)",
              ]}
              cta={{ label: "Créer ma ligue Pro", href: "/leagues/new?plan=pro" }}
            />
          </Reveal>
        </div>
      </div>

      <p className="relative z-[1] mt-10 text-center text-sm text-[var(--pc-muted)]">
        Chaque pack permet de créer <strong className="font-semibold text-white/90">une seule</strong>{" "}
        ligue privée. Pour créer une autre ligue, il faut acheter un nouveau pack.
      </p>
      <p className="mt-2 text-center text-xs text-[var(--pc-muted)]">
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
    <article className={`pc-pricing-card h-full ${highlight ? "pc-pricing-card-highlight" : ""}`}>
      <span
        className={`relative z-[1] w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
          highlight
            ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_4px_20px_rgba(168,85,247,0.45)]"
            : "border border-white/10 bg-white/[0.06] text-[var(--pc-muted)]"
        }`}
      >
        {tag}
      </span>

      <h3 className="relative z-[1] mt-6 font-[family-name:var(--pc-font-display)] text-2xl font-bold tracking-tight text-white">
        {name}
      </h3>
      <p className="relative z-[1] mt-2 text-sm text-[var(--pc-muted)]">{description}</p>

      <div className="relative z-[1] mt-8 flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--pc-font-display)] text-[3rem] font-bold leading-none tracking-tight text-white">
          {price}
        </span>
        <span className="text-sm text-[var(--pc-muted)]">
          {unit}
          {perUnit}
        </span>
      </div>

      <Link href={cta.href} className={`${landing.btnPrimary} relative z-[1] mt-6 w-full`}>
        {cta.label}
      </Link>

      <ul className="relative z-[1] mt-8 flex-1 space-y-3 border-t border-white/[0.06] pt-6 text-sm text-[var(--pc-muted)]">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
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
