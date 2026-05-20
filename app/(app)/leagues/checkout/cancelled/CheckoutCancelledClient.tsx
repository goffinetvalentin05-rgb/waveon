"use client";

import { GlassPanel } from "@/components/pronoclash/ui/GlassPanel";
import { SecondaryButton } from "@/components/pronoclash/ui/SecondaryButton";
import { AppSecondaryPage } from "@/components/pronoclash/AppSecondaryPage";
import { RetryPaymentButton } from "./RetryPaymentButton";

type Props = {
  username?: string | null;
  email?: string | null;
  isAdmin?: boolean;
  league: {
    id: string;
    name: string;
    plan: string;
  } | null;
  canRetry: boolean;
};

export function CheckoutCancelledClient({
  username,
  email,
  isAdmin,
  league,
  canRetry,
}: Props) {
  const bodyText = league
    ? "Ta ligue n'a pas encore été activée. Tu peux relancer le paiement ou créer une nouvelle ligue."
    : "Tu n'as pas finalisé le paiement. Aucune ligue n'a été activée — tu peux en créer une nouvelle quand tu veux.";

  return (
    <AppSecondaryPage
      pageTitle="Paiement annulé"
      username={username}
      email={email}
      isAdmin={isAdmin}
      centered
    >
      <GlassPanel glow="orange" className="pc-state-card pc-animate-in">
        <div className="pc-state-icon warn" aria-hidden>
          ✕
        </div>
        <h1 className="pc-state-title">Paiement annulé</h1>
        <p className="pc-state-text">{bodyText}</p>
        {league ? (
          <p className="pc-state-text" style={{ marginTop: 10, fontSize: 12 }}>
            Ligue : <strong style={{ color: "var(--pc-text)" }}>{league.name}</strong>
          </p>
        ) : null}
        <div className="pc-state-actions">
          {canRetry && league ? (
            <RetryPaymentButton
              leagueId={league.id}
              plan={league.plan}
              leagueName={league.name}
            />
          ) : null}
          <SecondaryButton href="/leagues/new" block>
            Créer une nouvelle ligue
          </SecondaryButton>
          <SecondaryButton href="/dashboard" block>
            Retour à l&apos;arène
          </SecondaryButton>
        </div>
      </GlassPanel>
    </AppSecondaryPage>
  );
}
