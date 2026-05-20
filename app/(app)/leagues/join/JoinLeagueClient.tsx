"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppSecondaryPage } from "@/components/pronoclash/AppSecondaryPage";
import { GlassPanel } from "@/components/pronoclash/ui/GlassPanel";
import { GradientButton } from "@/components/pronoclash/ui/GradientButton";

type Props = {
  username?: string | null;
  email?: string | null;
  isAdmin?: boolean;
};

export function JoinLeagueClient({ username, email, isAdmin }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) return;
    router.push(`/leagues/join/${encodeURIComponent(trimmed)}`);
  };

  return (
    <AppSecondaryPage pageTitle="Rejoindre une ligue" username={username} email={email} isAdmin={isAdmin}>
      <p className="pc-body-text" style={{ marginTop: 0 }}>
        Entre le code d&apos;invitation reçu sur WhatsApp. Rejoindre une ligue privée est gratuit —
        seule la création est payante.
      </p>
      <GlassPanel className="pc-form-card pc-animate-in" style={{ marginTop: 16 }}>
        <form onSubmit={submit}>
          <label className="pc-label" htmlFor="invite-code">
            Code d&apos;invitation
          </label>
          <input
            id="invite-code"
            type="text"
            className="pc-input"
            style={{ marginTop: 8, textTransform: "uppercase", letterSpacing: "0.12em" }}
            placeholder="Ex. AB12CD34"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={12}
            autoFocus
          />
          <div style={{ marginTop: 18 }}>
            <GradientButton type="submit" block large disabled={code.trim().length < 4}>
              Rejoindre la ligue
            </GradientButton>
          </div>
        </form>
      </GlassPanel>
    </AppSecondaryPage>
  );
}
