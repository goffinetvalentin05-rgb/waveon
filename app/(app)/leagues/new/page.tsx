import { Suspense } from "react";
import { LEAGUE_PLANS } from "@/lib/stripe/config";
import { ui } from "@/lib/design/tokens";
import { NewLeagueForm } from "./NewLeagueForm";

export default function NewLeaguePage() {
  const plans = Object.values(LEAGUE_PLANS);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
          Nouvelle ligue
        </p>
        <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">
          Crée ta ligue privée
        </h1>
        <p className="max-w-xl text-sm text-white/60">
          Choisis ton plan, donne un nom à ta ligue. Tu reçois un lien
          d&apos;invitation WhatsApp dès le paiement validé.
        </p>
      </header>

      <Suspense fallback={<div className={`${ui.glassCard} p-6 text-sm text-white/60`}>Chargement…</div>}>
        <NewLeagueForm plans={plans} />
      </Suspense>

      <p className="text-center text-xs text-white/40">
        Paiement unique via Stripe · pas d&apos;abonnement · pas de mise d&apos;argent entre joueurs.
      </p>
    </div>
  );
}
