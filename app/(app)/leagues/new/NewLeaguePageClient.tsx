"use client";

import { Suspense } from "react";
import type { LeaguePlan } from "@/lib/stripe/config";
import { PronoClashShell } from "@/components/dashboard/PronoClashShell";
import { NewLeagueForm } from "./NewLeagueForm";

type Props = {
  username?: string | null;
  email?: string | null;
  plans: LeaguePlan[];
};

export function NewLeaguePageClient({ username, email, plans }: Props) {
  return (
    <PronoClashShell pageTitle="Crée ta ligue privée" username={username} email={email}>
      <p className="pc-eyebrow">Nouvelle ligue</p>
      <p className="pc-body-text" style={{ marginTop: 0 }}>
        Choisis ton plan, donne un nom à ta ligue. Tu reçois un lien d&apos;invitation WhatsApp dès le
        paiement validé.
      </p>

      <Suspense fallback={<div className="pc-form-card pc-glass pc-body-text">Chargement…</div>}>
        <NewLeagueForm plans={plans} />
      </Suspense>

      <p className="pc-footnote">
        Paiement unique via Stripe · pas d&apos;abonnement · pas de mise d&apos;argent entre joueurs.
      </p>
    </PronoClashShell>
  );
}
