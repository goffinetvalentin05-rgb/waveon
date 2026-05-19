"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isToday, isTomorrow, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconBallFootball,
  IconBolt,
  IconCalendar,
  IconChartBar,
  IconChevronRight,
  IconHome,
  IconPlus,
  IconShield,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";

export type DashboardLeague = {
  key: string;
  name: string;
  kindLabel: string;
  points: number;
  href: string;
  pending?: boolean;
  pendingLabel?: string;
  payHref?: string;
  iconVariant: 1 | 2;
};

export type DashboardUpcomingMatch = {
  id: string;
  kickoffAt: string;
  compLabel: string;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  homeFlagClass?: "pcd-team-fr" | "pcd-team-br" | null;
  awayFlagClass?: "pcd-team-fr" | "pcd-team-br" | null;
};

export type DashboardViewProps = {
  username: string;
  totalPoints: number;
  rank: number;
  contestTitle: string;
  contestSubtitle: string;
  leagues: DashboardLeague[];
  leaguesEmptyHint?: string;
  upcomingMatches: DashboardUpcomingMatch[];
};

function avatarLetter(username: string) {
  const t = username.trim();
  return (t[0] ?? "J").toUpperCase();
}

function leagueInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "LG";
}

function formatKickoffLabel(iso: string) {
  const d = new Date(iso);
  const time = format(d, "HH:mm", { locale: fr });
  if (isToday(d)) return `AUJ. · ${time}`;
  if (isTomorrow(d)) return `DEMAIN · ${time}`;
  return format(d, "EEE d MMM · HH:mm", { locale: fr }).toUpperCase();
}

function navActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardView({
  username,
  totalPoints,
  rank,
  contestTitle,
  contestSubtitle,
  leagues,
  leaguesEmptyHint,
  upcomingMatches,
}: DashboardViewProps) {
  const pathname = usePathname();
  const letter = avatarLetter(username);

  return (
    <div className="pcd-wrap">
      <div className="pcd-inner">
        <div className="pcd-topbar">
          <div className="pcd-logo">
            <div className="pcd-logo-icon">
              <IconBolt size={18} stroke={2.2} />
            </div>
            <span>Prono Clash</span>
          </div>
          <nav className="pcd-nav">
            <Link
              href="/dashboard"
              className={`pcd-nav-item${navActive(pathname, "/dashboard") ? " active" : ""}`}
            >
              <IconHome size={16} stroke={2} />
              <span>Accueil</span>
            </Link>
            <Link
              href="/matches"
              className={`pcd-nav-item${navActive(pathname, "/matches") ? " active" : ""}`}
            >
              <IconBallFootball size={16} stroke={2} />
              <span>Matchs</span>
            </Link>
            <Link
              href="/leaderboard"
              className={`pcd-nav-item${navActive(pathname, "/leaderboard") ? " active" : ""}`}
            >
              <IconTrophy size={16} stroke={2} />
              <span>Classement</span>
            </Link>
          </nav>
          <div className="pcd-avatar" aria-hidden>
            {letter}
          </div>
        </div>

        <div className="pcd-hero">
          <div className="pcd-hero-avatar">{letter}</div>
          <div className="pcd-hero-text">
            <div className="pcd-hero-label">Salut</div>
            <div className="pcd-hero-name">{username}</div>
            <div className="pcd-hero-sub">
              Bienvenue dans ton QG · Tournoi mondial 2026
            </div>
          </div>
          <div className="pcd-hero-stats">
            <div className="pcd-stat">
              <div className="pcd-stat-label">Points</div>
              <div className="pcd-stat-value">{totalPoints}</div>
            </div>
            <div className="pcd-stat pcd-stat-rank">
              <div className="pcd-stat-label">Rang</div>
              <div className="pcd-stat-value">#{rank}</div>
            </div>
          </div>
        </div>

        <div className="pcd-concours">
          <div className="pcd-concours-icon">
            <IconTrophy size={22} stroke={2} />
          </div>
          <div className="pcd-concours-text">
            <div className="pcd-concours-label">Concours gratuit</div>
            <div className="pcd-concours-title">{contestTitle}</div>
            <div className="pcd-concours-sub">{contestSubtitle}</div>
          </div>
          <Link href="/global/leaderboard" className="pcd-btn pcd-btn-ghost">
            Classement
          </Link>
          <Link href="/matches" className="pcd-btn pcd-btn-primary">
            Pronostiquer
          </Link>
        </div>

        <div className="pcd-section-head">
          <div className="pcd-section-title">Match à la une</div>
          <Link href="/matches" className="pcd-section-link">
            Tous les matchs →
          </Link>
        </div>

        {/* TODO: brancher données matchs (match live / à la une depuis Supabase) */}
        <div className="pcd-match-featured">
          <div className="pcd-match-bg" />
          <div className="pcd-stadium-lines" />
          <div className="pcd-match-content">
            <div className="pcd-match-top">
              <div className="pcd-match-meta">
                <div className="pcd-badge-live">
                  <span className="pcd-live-dot" />
                  LIVE
                </div>
                <span className="pcd-match-comp">Quart de finale · 22:31</span>
              </div>
              <div className="pcd-match-joker">
                <IconBolt size={12} stroke={2.5} />
                Joker x2 activé
              </div>
            </div>
            <div className="pcd-match-teams">
              <div className="pcd-team">
                <div className="pcd-team-flag pcd-team-fr">FR</div>
                <div className="pcd-team-name">France</div>
              </div>
              <div className="pcd-match-score">
                <span className="pcd-score-num">2</span>
                <span className="pcd-score-sep">VS</span>
                <span className="pcd-score-num">1</span>
              </div>
              <div className="pcd-team">
                <div className="pcd-team-flag pcd-team-br">BR</div>
                <div className="pcd-team-name">Brésil</div>
              </div>
            </div>
            <div className="pcd-match-bottom">
              <Link href="/matches" className="pcd-match-btn pcd-match-btn-ghost">
                Voir le détail
              </Link>
              <Link href="/matches" className="pcd-match-btn pcd-match-btn-primary">
                Verrouiller mon prono
              </Link>
            </div>
          </div>
        </div>

        <div className="pcd-grid">
          <div className="pcd-card">
            <div className="pcd-card-head">
              <div className="pcd-card-title">Mes ligues</div>
              <div className="pcd-card-actions">
                <Link href="/leagues/new" className="pcd-icon-btn" aria-label="Créer une ligue">
                  <IconPlus size={14} stroke={2.5} />
                </Link>
                <Link href="/leagues/join" className="pcd-icon-btn" aria-label="Rejoindre une ligue">
                  <IconUsers size={14} stroke={2} />
                </Link>
              </div>
            </div>

            {leagues.length === 0 && leaguesEmptyHint ? (
              <p className="pcd-leagues-empty">{leaguesEmptyHint}</p>
            ) : null}

            {leagues.map((ligue) => (
              <div
                key={ligue.key}
                className={`pcd-ligue-item${ligue.pending ? " pending" : ""}`}
              >
                <div
                  className={`pcd-ligue-icon pcd-ligue-icon-${ligue.iconVariant}`}
                >
                  {leagueInitials(ligue.name)}
                </div>
                <div className="pcd-ligue-info">
                  <div className="pcd-ligue-name">{ligue.name}</div>
                  <div className="pcd-ligue-meta">
                    {ligue.pending && ligue.pendingLabel
                      ? ligue.pendingLabel
                      : `${ligue.kindLabel} · ${ligue.points} pts`}
                  </div>
                </div>
                {ligue.pending && ligue.payHref ? (
                  <Link href={ligue.payHref} className="pcd-ligue-action pay">
                    Payer →
                  </Link>
                ) : (
                  <Link href={ligue.href} className="pcd-ligue-action">
                    Ouvrir →
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="pcd-card">
            <div className="pcd-card-title pcd-card-title-spaced">Raccourcis</div>
            <div className="pcd-shortcuts">
              <Link href="/matches" className="pcd-shortcut">
                <div className="pcd-shortcut-ic">
                  <IconCalendar size={14} stroke={2} />
                </div>
                <span className="pcd-shortcut-text">Pronostiquer</span>
                <IconChevronRight size={16} className="pcd-shortcut-arrow" stroke={2} />
              </Link>
              <Link href="/global/leaderboard" className="pcd-shortcut">
                <div className="pcd-shortcut-ic">
                  <IconChartBar size={14} stroke={2} />
                </div>
                <span className="pcd-shortcut-text">Classement</span>
                <IconChevronRight size={16} className="pcd-shortcut-arrow" stroke={2} />
              </Link>
              <Link href="/legal/contest-rules" className="pcd-shortcut">
                <div className="pcd-shortcut-ic">
                  <IconShield size={14} stroke={2} />
                </div>
                <span className="pcd-shortcut-text">Règlement</span>
                <IconChevronRight size={16} className="pcd-shortcut-arrow" stroke={2} />
              </Link>
            </div>
          </div>
        </div>

        <div className="pcd-section-head">
          <div className="pcd-section-title">Prochains matchs</div>
          <Link href="/matches" className="pcd-section-link">
            Tout voir →
          </Link>
        </div>

        <div className="pcd-scroll-row">
          {upcomingMatches.length > 0 ? (
            upcomingMatches.map((m) => (
              <Link key={m.id} href="/matches" className="pcd-mini-match">
                <div className="pcd-mini-head">
                  <span className="pcd-mini-date">{formatKickoffLabel(m.kickoffAt)}</span>
                  <span className="pcd-mini-comp">{m.compLabel}</span>
                </div>
                <div className="pcd-mini-teams">
                  <div className="pcd-mini-team">
                    <div
                      className={`pcd-mini-flag${m.homeFlagClass ? ` ${m.homeFlagClass}` : ""}`}
                    >
                      {m.homeCode}
                    </div>
                    <span className="pcd-mini-name">{m.homeName}</span>
                  </div>
                  <span className="pcd-mini-vs">VS</span>
                  <div className="pcd-mini-team pcd-mini-team-end">
                    <span className="pcd-mini-name">{m.awayName}</span>
                    <div
                      className={`pcd-mini-flag${m.awayFlagClass ? ` ${m.awayFlagClass}` : ""}`}
                    >
                      {m.awayCode}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            /* TODO: brancher données matchs — affichage vide */
            <div className="pcd-mini-match pcd-mini-match-placeholder">
              <div className="pcd-mini-head">
                <span className="pcd-mini-date">—</span>
                <span className="pcd-mini-comp">—</span>
              </div>
              <p className="pcd-mini-empty">Aucun match programmé pour le moment.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pcd-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        @keyframes pcd-shine {
          0% {
            transform: translateX(-120%) skewX(-20deg);
          }
          100% {
            transform: translateX(220%) skewX(-20deg);
          }
        }
        @keyframes pcd-orb-float {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(20px, -15px);
          }
        }

        .pcd-wrap {
          background: linear-gradient(180deg, #0a0e1a 0%, #0f1424 50%, #0a0e1a 100%);
          min-height: calc(100vh - 4rem);
          padding: 20px;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          width: 100vw;
          max-width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          box-sizing: border-box;
        }
        .pcd-wrap::before {
          content: "";
          position: absolute;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: #6366f1;
          filter: blur(120px);
          opacity: 0.2;
          animation: pcd-orb-float 10s ease-in-out infinite;
        }
        .pcd-wrap::after {
          content: "";
          position: absolute;
          bottom: -100px;
          left: -100px;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: #a855f7;
          filter: blur(120px);
          opacity: 0.15;
          animation: pcd-orb-float 12s ease-in-out infinite reverse;
        }
        .pcd-inner {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
        }

        .pcd-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .pcd-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-weight: 700;
          font-size: 16px;
        }
        .pcd-logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .pcd-nav {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.04);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .pcd-nav-item {
          padding: 8px 16px;
          border-radius: 8px;
          color: #9ca3af;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          text-decoration: none;
        }
        .pcd-nav-item.active {
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.25),
            rgba(168, 85, 247, 0.2)
          );
          color: #fff;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
        }
        .pcd-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #0ea5e9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .pcd-hero {
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.12) 0%,
            rgba(168, 85, 247, 0.08) 100%
          );
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .pcd-hero::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 25%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.06),
            transparent
          );
          animation: pcd-shine 5s ease-in-out infinite;
        }
        .pcd-hero-avatar {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #06b6d4, #0ea5e9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 20px;
          flex-shrink: 0;
        }
        .pcd-hero-text {
          flex: 1;
        }
        .pcd-hero-label {
          color: #6366f1;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .pcd-hero-name {
          color: #fff;
          font-size: 22px;
          font-weight: 700;
          margin: 2px 0;
          letter-spacing: -0.5px;
        }
        .pcd-hero-sub {
          color: #9ca3af;
          font-size: 12px;
        }
        .pcd-hero-stats {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }
        .pcd-stat {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 14px;
          min-width: 75px;
          text-align: center;
        }
        .pcd-stat-label {
          color: #6b7280;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .pcd-stat-value {
          color: #fff;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.1;
          margin-top: 2px;
        }
        .pcd-stat-rank {
          background: linear-gradient(
            135deg,
            rgba(168, 85, 247, 0.2),
            rgba(99, 102, 241, 0.15)
          );
          border-color: rgba(168, 85, 247, 0.3);
        }
        .pcd-stat-rank .pcd-stat-value {
          background: linear-gradient(135deg, #a855f7, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .pcd-concours {
          background: linear-gradient(
            135deg,
            rgba(250, 204, 21, 0.08),
            rgba(168, 85, 247, 0.08)
          );
          border: 1px solid rgba(250, 204, 21, 0.2);
          border-radius: 16px;
          padding: 14px 18px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          overflow: hidden;
          flex-wrap: wrap;
        }
        .pcd-concours-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }
        .pcd-concours-text {
          flex: 1;
          min-width: 180px;
        }
        .pcd-concours-label {
          color: #fbbf24;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .pcd-concours-title {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          margin-top: 2px;
        }
        .pcd-concours-sub {
          color: #9ca3af;
          font-size: 11px;
          margin-top: 1px;
        }
        .pcd-btn {
          padding: 9px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          border: none;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .pcd-btn-primary {
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: #fff;
        }
        .pcd-btn-ghost {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .pcd-section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 24px 0 12px;
        }
        .pcd-section-title {
          color: #fff;
          font-size: 16px;
          font-weight: 600;
        }
        .pcd-section-link {
          color: #6366f1;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
        }

        .pcd-match-featured {
          position: relative;
          border-radius: 20px;
          margin-bottom: 14px;
          overflow: hidden;
          min-height: 200px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%);
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .pcd-match-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.3) 0%, transparent 50%),
            linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
        }
        .pcd-stadium-lines {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.04) 50%,
              transparent 100%
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              rgba(255, 255, 255, 0.03) 40px,
              rgba(255, 255, 255, 0.03) 41px
            );
        }
        .pcd-match-content {
          position: relative;
          z-index: 2;
          padding: 18px 20px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 200px;
        }
        .pcd-match-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .pcd-match-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pcd-badge-live {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
        }
        .pcd-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          animation: pcd-pulse 1.2s infinite;
        }
        .pcd-match-comp {
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          font-weight: 500;
        }
        .pcd-match-joker {
          background: rgba(168, 85, 247, 0.2);
          border: 1px solid rgba(168, 85, 247, 0.4);
          color: #d8b4fe;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pcd-match-teams {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 8px 0;
        }
        .pcd-team {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }
        .pcd-team-flag {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .pcd-team-fr {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
        }
        .pcd-team-br {
          background: linear-gradient(135deg, #10b981, #fbbf24);
        }
        .pcd-team-name {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
        }
        .pcd-match-score {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
        }
        .pcd-score-num {
          color: #fff;
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -1px;
          line-height: 1;
        }
        .pcd-score-sep {
          color: rgba(255, 255, 255, 0.4);
          font-size: 18px;
          font-weight: 500;
        }

        .pcd-match-bottom {
          display: flex;
          gap: 8px;
        }
        .pcd-match-btn {
          flex: 1;
          padding: 11px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          border: none;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pcd-match-btn-primary {
          background: #fff;
          color: #111827;
        }
        .pcd-match-btn-ghost {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
        }

        .pcd-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }

        .pcd-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          padding: 16px;
        }
        .pcd-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .pcd-card-title {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
        }
        .pcd-card-title-spaced {
          margin-bottom: 12px;
        }
        .pcd-card-actions {
          display: flex;
          gap: 6px;
        }
        .pcd-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          cursor: pointer;
          text-decoration: none;
        }
        .pcd-leagues-empty {
          color: #6b7280;
          font-size: 11px;
          margin-bottom: 10px;
          line-height: 1.5;
        }

        .pcd-ligue-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          margin-bottom: 8px;
        }
        .pcd-ligue-item.pending {
          background: linear-gradient(90deg, rgba(250, 204, 21, 0.08), transparent);
          border-color: rgba(250, 204, 21, 0.2);
        }
        .pcd-ligue-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .pcd-ligue-icon-1 {
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
        }
        .pcd-ligue-icon-2 {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
        }
        .pcd-ligue-info {
          flex: 1;
          min-width: 0;
        }
        .pcd-ligue-name {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
        }
        .pcd-ligue-meta {
          color: #6b7280;
          font-size: 10px;
          margin-top: 1px;
        }
        .pcd-ligue-action {
          color: #9ca3af;
          font-size: 11px;
          font-weight: 500;
          padding: 5px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }
        .pcd-ligue-action.pay {
          color: #fbbf24;
          background: rgba(250, 204, 21, 0.1);
        }

        .pcd-shortcuts {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pcd-shortcut {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
        }
        .pcd-shortcut-ic {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6366f1;
        }
        .pcd-shortcut-text {
          flex: 1;
        }
        .pcd-shortcut :global(.pcd-shortcut-arrow) {
          color: #6b7280;
        }

        .pcd-scroll-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .pcd-mini-match {
          min-width: 200px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 12px;
          flex-shrink: 0;
          text-decoration: none;
          display: block;
          color: inherit;
        }
        .pcd-mini-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .pcd-mini-date {
          color: #6366f1;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .pcd-mini-comp {
          color: #6b7280;
          font-size: 9px;
        }
        .pcd-mini-teams {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .pcd-mini-team {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }
        .pcd-mini-team-end {
          justify-content: flex-end;
        }
        .pcd-mini-flag {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.12);
        }
        .pcd-mini-flag.pcd-team-fr {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
        }
        .pcd-mini-flag.pcd-team-br {
          background: linear-gradient(135deg, #10b981, #fbbf24);
        }
        .pcd-mini-name {
          color: #fff;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pcd-mini-vs {
          color: #4b5563;
          font-size: 9px;
          padding: 0 4px;
        }
        .pcd-mini-empty {
          color: #6b7280;
          font-size: 11px;
          margin: 0;
        }

        @media (max-width: 768px) {
          .pcd-grid {
            grid-template-columns: 1fr;
          }
          .pcd-hero {
            flex-direction: column;
            align-items: flex-start;
          }
          .pcd-hero-stats {
            width: 100%;
          }
          .pcd-stat {
            flex: 1;
          }
          .pcd-concours {
            flex-direction: column;
            align-items: flex-start;
          }
          .pcd-nav-item span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
