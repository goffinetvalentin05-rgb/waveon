"use client";

import { IconTrophy } from "@tabler/icons-react";
import Link from "next/link";
import { PronoClashShell } from "@/components/dashboard/PronoClashShell";
import { getAvatarLetter } from "@/lib/pronoclash/user-display";

export type LeaderboardRow = {
  id: string;
  username: string;
  totalPoints: number;
  exactScores?: number;
  correctWinners?: number;
  predictionsCount?: number;
};

export type LeaderboardViewProps = {
  username?: string | null;
  email?: string | null;
  rows: LeaderboardRow[];
  currentUserId?: string;
  myRank?: number;
  myPoints?: number;
};

function rankBadgeClass(idx: number) {
  if (idx === 0) return "gold";
  if (idx === 1) return "silver";
  if (idx === 2) return "bronze";
  return "default";
}

export function LeaderboardView({
  username,
  email,
  rows,
  currentUserId,
  myRank,
  myPoints,
}: LeaderboardViewProps) {
  return (
    <PronoClashShell pageTitle="Classement" username={username} email={email}>
      <p className="pc-body-text">
        Le premier de ce classement à la fin du tournoi gagne le lot du concours.
        {myRank !== undefined && myRank >= 0 && myPoints !== undefined
          ? ` Tu es ${myRank + 1}ᵉ avec ${myPoints} pts.`
          : null}
      </p>

      {rows.length === 0 ? (
        <div className="pc-empty pc-glass">
          <IconTrophy size={28} stroke={1.5} className="pc-empty-icon" />
          <p>Pas encore de classement. Les points apparaîtront après les premiers pronostics.</p>
          <Link href="/matches" className="pc-link">
            Voir les matchs
          </Link>
        </div>
      ) : (
        <ol className="pc-leaderboard-list pc-glass">
          {rows.map((r, idx) => (
            <li
              key={r.id}
              className={`pc-leaderboard-row${r.id === currentUserId ? " me" : ""}`}
            >
              <div className="pc-leaderboard-user">
                <span className={`pc-rank-badge ${rankBadgeClass(idx)}`}>{idx + 1}</span>
                <span className="pc-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                  {getAvatarLetter(r.username, null)}
                </span>
                <span className="pc-leaderboard-name">
                  @{r.username.replace(/^@+/, "")}
                  {r.id === currentUserId ? (
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#a5b4fc" }}>moi</span>
                  ) : null}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="pc-leaderboard-pts">{r.totalPoints} pts</span>
                {r.exactScores !== undefined ? (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--pc-muted)",
                      marginTop: 2,
                      fontWeight: 400,
                    }}
                  >
                    {r.exactScores} exact · {r.correctWinners ?? 0} vainqueurs ·{" "}
                    {r.predictionsCount ?? 0} pronos
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </PronoClashShell>
  );
}
