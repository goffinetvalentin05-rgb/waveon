import Link from "next/link";
import { ui } from "@/lib/design/tokens";
import { LEAGUE_PLANS } from "@/lib/stripe/config";

export function PrivateLeaguesSection() {
  const privatePlan = LEAGUE_PLANS.private;
  const proPlan = LEAGUE_PLANS.pro;

  return (
    <section id="ligues-privees" className={ui.section}>
      <div className={ui.container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Mode premium
          </p>
          <h2 className={`${ui.h2} mt-3`}>Ligues privées entre potes.</h2>
          <p className="mt-4 text-base text-white/60">
            Créer une ligue est payant. Rejoindre une ligue via invitation est gratuit.
            Le créateur paie une seule fois — ses potes entrent sans payer.
          </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <FeatureCard
            title="Création payante"
            text="Le créateur choisit Private ou Pro League et paie via Stripe. La ligue est activée instantanément."
          />
          <FeatureCard
            title="Invitation gratuite"
            text="Chaque membre reçoit un lien privé. Rejoins la ligue de tes potes sans débourser un centime."
          />
          <FeatureCard
            title="Cartes & sabotage"
            text="Joker x2, Vol de score, Carton rouge, Tacle glissé, VAR… Uniquement dans la ligue privée."
          />
          <FeatureCard
            title="WhatsApp natif"
            text="Bouton d'invitation prérempli, résumés après match, classement partageable."
          />
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup?next=create-league" className={ui.btnPrimaryLg}>
            Créer ma ligue
            {privatePlan ? ` · dès CHF ${privatePlan.priceChf.toFixed(2)}` : ""}
          </Link>
          {proPlan ? (
            <span className="text-sm text-white/50">
              ou Pro League · CHF {proPlan.priceChf.toFixed(2)} · jusqu&apos;à {proPlan.maxPlayers} membres
            </span>
          ) : null}
        </div>
        <p className="mt-4 text-center text-xs text-white/40">
          Les ligues privées n&apos;influencent pas le concours global ni le classement général.
        </p>
      </div>
    </section>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className={`${ui.glassCard} p-6`}>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{text}</p>
    </div>
  );
}
