"use client";

import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconBallFootball,
  IconChevronRight,
  IconHome,
  IconPlus,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import { PronoClashShell } from "@/components/dashboard/PronoClashShell";
import { longStageLabel } from "@/lib/pronoclash/match-display";

export type DashboardLeague = {
  key: string;
  name: string;
  kindLabel: string;
  points: number;
  href: string;
  pending?: boolean;
  pendingLabel?: string;
  payHref?: string;
};

export type DashboardUpcomingMatch = {
  id: string;
  kickoffAt: string;
  compLabel: string;
  homeName: string;
  awayName: string;
  homeEmoji?: string | null;
  awayEmoji?: string | null;
};

export type DashboardFeaturedMatch = {
  id: string;
  status: "live" | "scheduled";
  kickoffAt: string;
  stage: string;
  groupName: string | null;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  homeEmoji?: string | null;
  awayEmoji?: string | null;
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
  leagues: DashboardLeague[];
  leaguesEmptyHint?: string;
  upcomingMatches: DashboardUpcomingMatch[];
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

function formatDateGroup(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return "Demain";
  return format(d, "EEEE d MMMM", { locale: fr });
}

function groupMatchesByDate(matches: DashboardUpcomingMatch[]) {
  const map = new Map<string, DashboardUpcomingMatch[]>();
  for (const m of matches) {
    const key = format(new Date(m.kickoffAt), "yyyy-MM-dd");
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: formatDateGroup(items[0].kickoffAt),
    items,
  }));
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
          <div className="pc-featured-team">
            <div className="pc-team-badge">{match.homeEmoji ?? match.homeCode}</div>
            <span>{match.homeName}</span>
          </div>
          {hasScore ? (
            <div className="pc-featured-score">
              <span>{match.homeScore}</span>
              <em>:</em>
              <span>{match.awayScore}</span>
            </div>
          ) : (
            <span className="pc-featured-time">{formatMatchTime(match.kickoffAt)}</span>
          )}
          <div className="pc-featured-team pc-featured-team-right">
            <div className="pc-team-badge pc-team-badge-alt">
              {match.awayEmoji ?? match.awayCode}
            </div>
            <span>{match.awayName}</span>
          </div>
        </div>
        <div className="pc-featured-actions">
          <Link href="/matches" className="pc-btn ghost light">
            Détail
          </Link>
          <Link href="/matches" className="pc-btn primary light">
            {isLive ? "Voir le match" : "Verrouiller mon prono"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DashboardView({
  username,
  email,
  totalPoints,
  rank,
  contestTitle,
  contestSubtitle,
  leagues,
  leaguesEmptyHint,
  upcomingMatches,
  featuredMatch,
  hasAnyMatchesInDb,
  isAdmin = false,
}: DashboardViewProps) {
  const matchGroups = groupMatchesByDate(upcomingMatches);
  const showContest = Boolean(contestTitle);
  const showMatchesEmpty =
    !hasAnyMatchesInDb && !featuredMatch && upcomingMatches.length === 0;

  return (
    <PronoClashShell pageTitle="Accueil" username={username} email={email}>
      <div className="pc-stats-row">
        <div className="pc-stat-card pc-glass">
          <span className="pc-stat-label">Points</span>
          <span className="pc-stat-value">{totalPoints}</span>
        </div>
        <div className="pc-stat-card pc-glass pc-stat-card-accent">
          <span className="pc-stat-label">Rang global</span>
          <span className="pc-stat-value pc-stat-gradient">#{rank}</span>
        </div>
      </div>

      {isAdmin ? (
        <Link
          href="/admin/tournament/matches"
          className="pc-btn primary"
          style={{ display: "inline-flex", width: "100%", justifyContent: "center", marginBottom: 4 }}
        >
          Admin matchs
        </Link>
      ) : null}

      {showContest ? (
        <div className="pc-contest pc-glass">
          <div className="pc-contest-icon">
            <IconTrophy size={20} stroke={1.8} />
          </div>
          <div className="pc-contest-body">
            <span className="pc-contest-tag">Concours gratuit</span>
            <p className="pc-contest-title">{contestTitle}</p>
            {contestSubtitle ? <p className="pc-contest-sub">{contestSubtitle}</p> : null}
          </div>
          <div className="pc-contest-actions">
            <Link href="/global/leaderboard" className="pc-btn ghost">
              Classement
            </Link>
            <Link href="/matches" className="pc-btn primary">
              Pronostiquer
            </Link>
          </div>
        </div>
      ) : null}

      {showMatchesEmpty ? (
        <div className="pc-empty pc-glass">
          <IconBallFootball size={28} stroke={1.5} className="pc-empty-icon" />
          <p>Les matchs du tournoi seront bientôt disponibles.</p>
        </div>
      ) : null}

      {featuredMatch ? (
        <>
          <div className="pc-section-head">
            <h2 className="pc-section-title">Match à la une</h2>
            <Link href="/matches" className="pc-link">
              Tout voir
              <IconChevronRight size={14} />
            </Link>
          </div>
          <FeaturedMatchCard match={featuredMatch} />
        </>
      ) : null}

      {upcomingMatches.length > 0 ? (
        <>
          <div className="pc-section-head">
            <h2 className="pc-section-title">Prochains matchs</h2>
            <Link href="/matches" className="pc-link">
              Tout voir
              <IconChevronRight size={14} />
            </Link>
          </div>
          {matchGroups.map((group) => (
            <section key={group.dateKey} className="pc-date-block">
              <h3 className="pc-date-label">{group.label}</h3>
              <div className="pc-match-list pc-glass">
                {group.items.map((m, idx) => (
                  <Link
                    key={m.id}
                    href="/matches"
                    className={`pc-match-row${idx < group.items.length - 1 ? " bordered" : ""}`}
                  >
                    <div className="pc-match-side">
                      <span className="pc-match-emoji">{m.homeEmoji ?? "🏳️"}</span>
                      <span className="pc-match-name">{m.homeName}</span>
                    </div>
                    <div className="pc-match-center">
                      <span className="pc-match-time">{formatMatchTime(m.kickoffAt)}</span>
                      <span className="pc-match-stage">{m.compLabel}</span>
                    </div>
                    <div className="pc-match-side pc-match-side-right">
                      <span className="pc-match-name">{m.awayName}</span>
                      <span className="pc-match-emoji">{m.awayEmoji ?? "🏳️"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </>
      ) : null}

      <div className="pc-section-head">
        <h2 className="pc-section-title">Mes ligues</h2>
        <div className="pc-section-actions">
          <Link href="/leagues/new" className="pc-icon-btn sm" aria-label="Créer une ligue">
            <IconPlus size={16} stroke={2} />
          </Link>
          <Link href="/leagues/join" className="pc-icon-btn sm" aria-label="Rejoindre">
            <IconUsers size={16} stroke={1.8} />
          </Link>
        </div>
      </div>

      {leaguesEmptyHint ? <p className="pc-hint">{leaguesEmptyHint}</p> : null}

      <div className="pc-standings pc-glass">
        <div className="pc-standings-head">
          <span className="col-rank">#</span>
          <span className="col-team">Ligue</span>
          <span className="col-type">Type</span>
          <span className="col-pts">Pts</span>
          <span className="col-go" />
        </div>
        {leagues.length === 0 ? (
          <p className="pc-standings-empty">Rejoins ou crée une ligue pour jouer avec tes potes.</p>
        ) : (
          leagues.map((ligue, i) => (
            <div
              key={ligue.key}
              className={`pc-standings-row${ligue.pending ? " pending" : ""}`}
            >
              <span className="col-rank">{i + 1}</span>
              <span className="col-team">
                <span className="pc-league-badge">{leagueInitials(ligue.name)}</span>
                <span className="pc-league-name">{ligue.name}</span>
              </span>
              <span className="col-type">{ligue.pending ? "—" : ligue.kindLabel}</span>
              <span className="col-pts">{ligue.pending ? "—" : ligue.points}</span>
              <span className="col-go">
                {ligue.pending && ligue.payHref ? (
                  <Link href={ligue.payHref} className="pc-row-link warn">
                    Payer
                  </Link>
                ) : (
                  <Link href={ligue.href} className="pc-row-link">
                    <IconChevronRight size={16} />
                  </Link>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="pc-shortcuts">
        <Link href="/matches" className="pc-shortcut pc-glass">
          <IconHome size={18} stroke={1.8} />
          <span>Pronostiquer</span>
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
