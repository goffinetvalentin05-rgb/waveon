"use client";

import { AppSecondaryPage } from "@/components/pronoclash/AppSecondaryPage";
import { CheckoutSuccessClient } from "./CheckoutSuccessClient";

type Props = {
  sessionId: string;
  initialSlug: string | null;
  initialStatus: string | null;
  initialName: string | null;
  username?: string | null;
  email?: string | null;
  isAdmin?: boolean;
};

export function CheckoutSuccessPageClient(props: Props) {
  const { sessionId, initialSlug, initialStatus, initialName, username, email, isAdmin } =
    props;

  return (
    <AppSecondaryPage
      pageTitle="Paiement"
      hidePageTitle
      username={username}
      email={email}
      isAdmin={isAdmin}
      centered
    >
      <CheckoutSuccessClient
        sessionId={sessionId}
        initialSlug={initialSlug}
        initialStatus={initialStatus}
        initialName={initialName}
      />
    </AppSecondaryPage>
  );
}
