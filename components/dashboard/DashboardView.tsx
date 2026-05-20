"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconBallFootball,
  IconChevronRight,
  IconPlus,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import { PronoClashShell } from "@/components/dashboard/PronoClashShell";
import { DashboardUpcomingSection } from "@/components/dashboard/DashboardClient";
import type {
  DashboardPrediction,
  DashboardPreviewMatch,
} from "@/components/dashboard/DashboardClient";
import { matchesPageHref } from "@/lib/pronoclash/league-context-url";
import { TeamDisplay } from "@/components/pronoclash/TeamDisplay";
import { longStageLabel } from "@/lib/pronoclash/match-display";
import type { LeagueContextOption } from "@/components/pronoclash/LeagueContextSelector";

export type DashboardLeagueCard = {
  key: string;
  leagueContextId: string | null;
  name: string;
  typeLabel: string;
  type: "general" | "private" | "pro";
  points: number;
  rank: number | null;
  memberCount?: number;
  pending?: boolean;
  pendingLabel?: string;
  payHref?: string;
  predictHref: string;
  leaderboardHref: string;
};

export type DashboardFeaturedMatch = {
  id: string;
  status: "live" | "scheduled";
  kickoffAt: string;
  stage: string;
  groupName: string | null;
  homeName: string | null;
  awayName: string | null;
  homeCountryCode: string | null;
  awayCountryCode: string | null;
  homeFlag: string | null;
  awayFlag: string | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

export type DashboardViewProps = {
  username?: string | null;
  email?: string | null;
  totalPoints: number;
  rank: number;
  contestTitle?: string | null;
  contestSubtitle?: string | null;
  leagueCards: DashboardLeagueCard[];
  leaguesEmptyHint?: string;
  leagueOptions: LeagueContextOption[];
  predictions: DashboardPrediction[];
  upcomingMatches: DashboardPreviewMatch[];
  featuredMatch?: DashboardFeaturedMatch | null;
  hasAnyMatchesInDb: boolean;
  isAdmin?: boolean;
};

function leagueInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "LG";
}

function formatMatchTime(iso: string) {
  return format(new Date(iso), "HH:mm", { locale: fr });
}

function FeaturedMatchCard({ match }: { match: DashboardFeaturedMatch }) {
  const meta = `${longStageLabel(match.stage, match.groupName)} · ${formatMatchTime(match.kickoffAt)}`;
  const isLive = match.status === "live";
  const hasScore =
    isLive && match.homeScore !== null && match.awayScore !== null;

  return (
    <div className="pc-featured">
      <div className="pc-featured-bg" />
      <div className="pc-featured-glow pc-featured-glow-left" />
      <div className="pc-featured-glow pc-featured-glow-right" />
      <div className="pc-featured-content">
        <div className="pc-featured-top">
          <span className={`pc-status-pill ${isLive ? "live" : "upcoming"}`}>
            {isLive ? (
              <>
                <span className="pc-live-dot" />
                LIVE
              </>
            ) : (
              "À venir"
            )}
          </span>
        </div>
        <p className="pc-featured-meta">{meta}</p>
        <div className="pc-featured-teams">
          <TeamDisplay
            name={match.homeName}
            country_code={match.homeCountryCode}
            flag_emoji={match.homeFlag}
            placeholder={match.homePlaceholder}
            align="center"
            size="lg"
          />
          {hasScore ? (
            <div className="pc-featured-score">
              <span>{match.homeScore}</span>
              <em>:</em>
              <span>{match.awayScore}</span>
            </div>
          ) : (
            <span className="pc-featured-time">{formatMatchTime(match.kickoffAt)}</span>
          )}
          <TeamDisplay
            name={match.awayName}
            country_code={match.awayCountryCode}
            flag_emoji={match.awayFlag}
            placeholder={match.awayPlaceholder}
            align="center"
            size="lg"
          />
        </div>
        <div className="pc-featured-actions">
          <Link href="/matches" className="pc-btn ghost light">
            Détail
          </Link>
          <Link href={matchesPageHref(null)} className="pc-btn primary light">
            {isLive ? "Voir le match" : "Pronostiquer (générale)"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function LeagueCard({ league }: { league: DashboardLeagueCard }) {
  return (
    <article className={`pc-league-card pc-glass${league.pending ? " pending" : ""}`}>
      <div className="pc-league-card-top">
        <span className="pc-league-badge">{leagueInitials(league.name)}</span>
        <div className="pc-league-card-meta">
          <h3 className="pc-league-card-name">{league.name}</h3>
          <span className={`pc-type-pill ${league.type}`}>{league.typeLabel}</span>
        </div>
        {league.rank !== null ? (
          <span className="pc-league-card-rank">#{league.rank}</span>
        ) : null}
      </div>

      {league.pending && league.pendingLabel ? (
        <p className="pc-league-card-warn">{league.pendingLabel}</p>
      ) : (
        <div className="pc-league-card-stats">
          <div>
            <span className="pc-stat-label">Points</span>
            <span className="pc-league-stat-value">{league.points}</span>
          </div>
          {league.memberCount !== undefined ? (
            <div>
              <span className="pc-stat-label">Membres</span>
              <span className="pc-league-stat-value">{league.memberCount}</span>
            </div>
          ) : (
            <div>
              <span className="pc-stat-label">Rang</span>
              <span className="pc-league-stat-value">
                {league.rank !== null ? `#${league.rank}` : "—"}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="pc-league-card-actions">
        {league.pending && league.payHref ? (
          <Link href={league.payHref} className="pc-btn primary block">
            Finaliser le paiement
          </Link>
        ) : (
          <>
            <Link href={league.predictHref} className="pc-btn primary">
              Pronostiquer
            </Link>
            <Link href={league.leaderboardHref} className="pc-btn ghost">
              Classement
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

export function DashboardView({
  username,
  email,
  totalPoints,
  rank,
  contestTitle,
  contestSubtitle,
  leagueCards,
  leaguesEmptyHint,
  leagueOptions,
  predictions,
  upcomingMatches,
  featuredMatch,
  hasAnyMatchesInDb,
  isAdmin = false,
}: DashboardViewProps) {
  const showMatchesEmpty =
    !hasAnyMatchesInDb && !featuredMatch && upcomingMatches.length === 0;

  return (
    <PronoClashShell pageTitle="Explorer" username={username} email={email}>
      <section className="pc-summary-header" aria-label="Résumé">
        <div className="pc-summary-grid">
          <div className="pc-stat-card pc-glass">
            <span className="pc-stat-label">Mes points</span>
            <span className="pc-stat-value">{totalPoints}</span>
            <span className="pc-stat-foot">Ligue générale</span>
          </div>
          <div className="pc-stat-card pc-glass pc-stat-card-accent">
            <span className="pc-stat-label">Mon rang global</span>
            <span className="pc-stat-value pc-stat-gradient">#{rank}</span>
            <span className="pc-stat-foot">Classement concours</span>
          </div>
        </div>
        <div className="pc-cta-row">
          <Link href="/leagues/new" className="pc-cta-card pc-glass primary">
            <IconPlus size={20} stroke={2} />
            <span>
              <strong>Créer une ligue</strong>
              <small>Ligue privée payante · tes potes</small>
            </span>
          </Link>
          <Link href="/leagues/join" className="pc-cta-card pc-glass">
            <IconUsers size={20} stroke={1.8} />
            <span>
              <strong>Rejoindre</strong>
              <small>Code d&apos;invitation</small>
            </span>
          </Link>
        </div>
      </section>

      {contestTitle ? (
        <div className="pc-contest pc-glass">
          <div className="pc-contest-icon">
            <IconTrophy size={20} stroke={1.8} />
          </div>
          <div className="pc-contest-body">
            <span className="pc-contest-tag">Concours gratuit</span>
            <p className="pc-contest-title">{contestTitle}</p>
            {contestSubtitle ? <p className="pc-contest-sub">{contestSubtitle}</p> : null}
          </div>
        </div>
      ) : null}

      {isAdmin ? (
        <Link
          href="/admin/tournament/matches"
          className="pc-btn primary block"
          style={{ marginBottom: 4 }}
        >
          Admin matchs
        </Link>
      ) : null}

      <div className="pc-section-head">
        <div>
          <h2 className="pc-section-title">Mes ligues</h2>
          <p className="pc-section-desc">
            La ligue générale et chaque ligue privée ont des pronostics séparés.
          </p>
        </div>
      </div>

      {leaguesEmptyHint ? <p className="pc-hint">{leaguesEmptyHint}</p> : null}

      <div className="pc-league-cards">
        {leagueCards.map((league) => (
          <LeagueCard key={league.key} league={league} />
        ))}
      </div>

      {showMatchesEmpty ? (
        <div className="pc-empty pc-glass">
          <IconBallFootball size={28} stroke={1.5} className="pc-empty-icon" />
          <p>Les matchs du tournoi seront bientôt disponibles.</p>
          <Link href={matchesPageHref(null)} className="pc-btn primary">
            Voir les matchs
          </Link>
        </div>
      ) : null}

      {featuredMatch ? (
        <>
          <div className="pc-section-head">
            <h2 className="pc-section-title">Match à la une</h2>
            <Link href={matchesPageHref(null)} className="pc-link">
              Tout voir
              <IconChevronRight size={14} />
            </Link>
          </div>
          <FeaturedMatchCard match={featuredMatch} />
        </>
      ) : null}

      <DashboardUpcomingSection
        leagueOptions={leagueOptions}
        predictions={predictions}
        upcomingMatches={upcomingMatches}
      />

      <div className="pc-shortcuts">
        <Link href={matchesPageHref(null)} className="pc-shortcut pc-glass">
          <IconBallFootball size={18} stroke={1.8} />
          <span>Tous les matchs</span>
          <IconChevronRight size={16} className="pc-shortcut-arrow" />
        </Link>
        <Link href="/global/leaderboard" className="pc-shortcut pc-glass">
          <IconTrophy size={18} stroke={1.8} />
          <span>Classement général</span>
          <IconChevronRight size={16} className="pc-shortcut-arrow" />
        </Link>
        <Link href="/legal/contest-rules" className="pc-shortcut pc-glass">
          <IconBallFootball size={18} stroke={1.8} />
          <span>Règlement du concours</span>
          <IconChevronRight size={16} className="pc-shortcut-arrow" />
        </Link>
      </div>
    </PronoClashShell>
  );
}
