"use client";

import Link from "next/link";
import { AppSecondaryPage } from "@/components/pronoclash/AppSecondaryPage";
import { GlassPanel } from "@/components/pronoclash/ui/GlassPanel";
import { CONTEST_COPY } from "@/lib/pronoclash/contest-copy";

type Props = {
  username?: string | null;
  email?: string | null;
  isAdmin?: boolean;
  totalUsers: number;
  totalPredictions: number;
  myPredictions: number;
  contest: {
    endsAt: string | null;
    isActive: boolean;
    configured: boolean;
  };
};

export function GlobalLeagueClient({
  username,
  email,
  isAdmin,
  totalUsers,
  totalPredictions,
  myPredictions,
  contest,
}: Props) {
  return (
    <AppSecondaryPage pageTitle="Ligue générale" username={username} email={email} isAdmin={isAdmin}>
      <p className="pc-eyebrow">Gratuit · ouvert à tous</p>
      <p className="pc-body-text" style={{ marginTop: 0 }}>
        Tout le monde joue dans la même ligue générale du tournoi mondial 2026. Pronostique les matchs
        et marque des points pour grimper au classement général.
      </p>

      <div className="pc-stats-row" style={{ marginTop: 16, marginBottom: 16 }}>
        <Stat label="Joueurs inscrits" value={String(totalUsers)} />
        <Stat label="Pronostics" value={String(totalPredictions)} />
        <Stat label="Tes pronos" value={String(myPredictions)} />
      </div>

      <GlassPanel glow="violet" className="pc-form-card pc-animate-in">
        <p className="pc-eyebrow" style={{ marginBottom: 8 }}>
          {CONTEST_COPY.communityBadge}
        </p>
        {contest.configured ? (
          <>
            <h2 className="pc-section-title" style={{ fontSize: 20, marginBottom: 8 }}>
              {CONTEST_COPY.title}
            </h2>
            <p className="pc-body-text" style={{ marginTop: 0 }}>
              {CONTEST_COPY.main}
            </p>
            <p className="pc-footnote" style={{ textAlign: "left", marginTop: 10 }}>
              {CONTEST_COPY.communityGoal}
            </p>
            <p className="pc-footnote" style={{ textAlign: "left", marginTop: 6 }}>
              {CONTEST_COPY.unlockCondition}
            </p>
            <p className="pc-footnote" style={{ textAlign: "left", marginTop: 6, opacity: 0.85 }}>
              {CONTEST_COPY.disclaimer}
            </p>
            <p className="pc-footnote" style={{ textAlign: "left", marginTop: 8 }}>
              Participation gratuite, aucun achat nécessaire.
            </p>
            {contest.endsAt ? (
              <p className="pc-footnote" style={{ textAlign: "left", marginTop: 10 }}>
                Clôture le {new Date(contest.endsAt).toLocaleDateString("fr-CH")}.
              </p>
            ) : null}
          </>
        ) : (
          <p className="pc-body-text" style={{ marginTop: 0 }}>
            Concours en cours de configuration.
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          <Link href="/matches" className="pc-btn primary">
            Pronostiquer
          </Link>
          <Link href="/global/leaderboard" className="pc-btn ghost">
            Classement
          </Link>
          <Link href="/legal/contest-rules" className="pc-btn ghost sm">
            Règlement
          </Link>
        </div>
      </GlassPanel>

      <GlassPanel className="pc-form-card pc-animate-in-delay-1" style={{ marginTop: 12 }}>
        <h2 className="pc-section-title" style={{ fontSize: 17, marginBottom: 10 }}>
          Règles MVP
        </h2>
        <ul className="pc-body-text" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
          <li style={{ marginBottom: 6 }}>• Score exact : +5 pts</li>
          <li style={{ marginBottom: 6 }}>• Bon vainqueur ou nul : +3 pts</li>
          <li style={{ marginBottom: 6 }}>• Bon écart de buts : +1 pt bonus</li>
          <li style={{ marginBottom: 6 }}>• Verrou au coup d&apos;envoi</li>
          <li>• Cartes : ligues privées uniquement</li>
        </ul>
      </GlassPanel>
    </AppSecondaryPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pc-glass" style={{ padding: 14, flex: 1, minWidth: 0 }}>
      <div className="pc-footnote" style={{ textAlign: "left", margin: 0, textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--pc-font-display)",
          fontSize: 24,
          fontWeight: 800,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
