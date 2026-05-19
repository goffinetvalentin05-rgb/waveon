"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconBallFootball,
  IconBell,
  IconChevronRight,
  IconHome,
  IconLogout,
  IconPlus,
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
  rank?: number;
};

export type DashboardUpcomingMatch = {
  id: string;
  kickoffAt: string;
  compLabel: string;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  homeEmoji?: string | null;
  awayEmoji?: string | null;
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
  const router = useRouter();
  const letter = avatarLetter(username);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };
  const handle = `@${username.toLowerCase().replace(/\s+/g, "")}`;
  const matchGroups = groupMatchesByDate(upcomingMatches);

  return (
    <div className="pc-wrap">
      <div className="pc-inner">
        {/* Header type référence : avatar + pill username */}
        <header className="pc-header">
          <div className="pc-header-left">
            <div className="pc-avatar">{letter}</div>
            <div className="pc-user-pill">
              <span className="pc-user-handle">{handle}</span>
            </div>
          </div>
          <div className="pc-header-actions">
            <Link href="/matches" className="pc-icon-btn" aria-label="Matchs">
              <IconBell size={18} stroke={1.8} />
            </Link>
            <button type="button" className="pc-icon-btn" onClick={logout} aria-label="Se déconnecter">
              <IconLogout size={18} stroke={1.8} />
            </button>
          </div>
        </header>

        <h1 className="pc-page-title">Accueil</h1>

        {/* Tabs style référence */}
        <nav className="pc-tabs" aria-label="Navigation principale">
          <Link
            href="/dashboard"
            className={`pc-tab${navActive(pathname, "/dashboard") ? " active" : ""}`}
          >
            Explorer
          </Link>
          <Link
            href="/matches"
            className={`pc-tab${navActive(pathname, "/matches") ? " active" : ""}`}
          >
            Matchs
          </Link>
          <Link
            href="/leaderboard"
            className={`pc-tab${navActive(pathname, "/leaderboard") ? " active" : ""}`}
          >
            Classement
          </Link>
        </nav>

        {/* Stats utilisateur */}
        <div className="pc-stats-row">
          <div className="pc-stat-card glass">
            <span className="pc-stat-label">Points</span>
            <span className="pc-stat-value">{totalPoints}</span>
          </div>
          <div className="pc-stat-card glass pc-stat-card-accent">
            <span className="pc-stat-label">Rang global</span>
            <span className="pc-stat-value pc-stat-gradient">#{rank}</span>
          </div>
        </div>

        {/* Bandeau concours */}
        <div className="pc-contest glass">
          <div className="pc-contest-icon">
            <IconTrophy size={20} stroke={1.8} />
          </div>
          <div className="pc-contest-body">
            <span className="pc-contest-tag">Concours gratuit</span>
            <p className="pc-contest-title">{contestTitle}</p>
            <p className="pc-contest-sub">{contestSubtitle}</p>
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

        {/* Match à la une — hero card */}
        <div className="pc-section-head">
          <h2 className="pc-section-title">Match à la une</h2>
          <Link href="/matches" className="pc-link">
            Tout voir
            <IconChevronRight size={14} />
          </Link>
        </div>

        {/* TODO: brancher données matchs (live / featured depuis Supabase) */}
        <div className="pc-featured">
          <div className="pc-featured-bg" />
          <div className="pc-featured-glow pc-featured-glow-left" />
          <div className="pc-featured-glow pc-featured-glow-right" />
          <div className="pc-featured-content">
            <div className="pc-featured-top">
              <span className="pc-featured-badge">MATCH DAY</span>
              <span className="pc-live-pill">
                <span className="pc-live-dot" />
                LIVE
              </span>
            </div>
            <p className="pc-featured-date">Quart de finale · 21:00</p>
            <div className="pc-featured-teams">
              <div className="pc-featured-team">
                <div className="pc-team-badge">FR</div>
                <span>France</span>
              </div>
              <div className="pc-featured-score">
                <span>2</span>
                <em>:</em>
                <span>1</span>
              </div>
              <div className="pc-featured-team pc-featured-team-right">
                <div className="pc-team-badge pc-team-badge-alt">BR</div>
                <span>Brésil</span>
              </div>
            </div>
            <div className="pc-featured-actions">
              <Link href="/matches" className="pc-btn ghost light">
                Détail
              </Link>
              <Link href="/matches" className="pc-btn primary light">
                Verrouiller mon prono
              </Link>
            </div>
          </div>
        </div>

        {/* Prochains matchs — groupés par date */}
        <div className="pc-section-head">
          <h2 className="pc-section-title">Prochains matchs</h2>
          <Link href="/matches" className="pc-link">
            Tout voir
            <IconChevronRight size={14} />
          </Link>
        </div>

        {matchGroups.length > 0 ? (
          matchGroups.map((group) => (
            <section key={group.dateKey} className="pc-date-block">
              <h3 className="pc-date-label">{group.label}</h3>
              <div className="pc-match-list glass">
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
          ))
        ) : (
          <div className="pc-empty glass">
            <IconBallFootball size={28} stroke={1.5} className="pc-empty-icon" />
            <p>Aucun match programmé pour le moment.</p>
            <Link href="/matches" className="pc-link">
              Voir les matchs
              <IconChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Mes ligues — tableau type standings */}
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

        <div className="pc-standings glass">
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

        {/* Raccourcis */}
        <div className="pc-shortcuts">
          <Link href="/matches" className="pc-shortcut glass">
            <IconHome size={18} stroke={1.8} />
            <span>Pronostiquer</span>
            <IconChevronRight size={16} className="pc-shortcut-arrow" />
          </Link>
          <Link href="/global/leaderboard" className="pc-shortcut glass">
            <IconTrophy size={18} stroke={1.8} />
            <span>Classement général</span>
            <IconChevronRight size={16} className="pc-shortcut-arrow" />
          </Link>
          <Link href="/legal/contest-rules" className="pc-shortcut glass">
            <IconBallFootball size={18} stroke={1.8} />
            <span>Règlement du concours</span>
            <IconChevronRight size={16} className="pc-shortcut-arrow" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes pc-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.45;
          }
        }
        @keyframes pc-glow-drift {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(12px, -8px) scale(1.08);
          }
        }

        .pc-wrap {
          --pc-bg: #0b0e14;
          --pc-surface: rgba(255, 255, 255, 0.04);
          --pc-border: rgba(255, 255, 255, 0.08);
          --pc-text: #f8fafc;
          --pc-muted: #94a3b8;
          --pc-cyan: #22d3ee;
          --pc-violet: #a78bfa;
          --pc-pink: #f472b6;

          background: var(--pc-bg);
          min-height: calc(100dvh - 5rem);
          padding: 12px 16px 32px;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--pc-text);
          width: 100vw;
          max-width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          box-sizing: border-box;
        }
        .pc-wrap::before {
          content: "";
          position: absolute;
          top: -80px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34, 211, 238, 0.18) 0%, transparent 70%);
          pointer-events: none;
          animation: pc-glow-drift 12s ease-in-out infinite;
        }
        .pc-wrap::after {
          content: "";
          position: absolute;
          bottom: 20%;
          left: -80px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(167, 139, 250, 0.14) 0%, transparent 70%);
          pointer-events: none;
          animation: pc-glow-drift 14s ease-in-out infinite reverse;
        }
        .pc-inner {
          position: relative;
          z-index: 1;
          max-width: 520px;
          margin: 0 auto;
        }

        .glass {
          background: var(--pc-surface);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--pc-border);
          border-radius: 20px;
        }

        .pc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .pc-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pc-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--pc-cyan), #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
          color: #fff;
          border: 2px solid rgba(255, 255, 255, 0.12);
          flex-shrink: 0;
        }
        .pc-user-pill {
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid var(--pc-border);
          backdrop-filter: blur(12px);
        }
        .pc-user-handle {
          font-size: 13px;
          font-weight: 600;
          color: var(--pc-text);
        }
        .pc-icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--pc-surface);
          border: 1px solid var(--pc-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--pc-muted);
          text-decoration: none;
          backdrop-filter: blur(12px);
        }
        .pc-icon-btn.sm {
          width: 32px;
          height: 32px;
          border-radius: 10px;
        }
        .pc-header-actions {
          display: flex;
          gap: 8px;
        }
        button.pc-icon-btn {
          cursor: pointer;
          font: inherit;
        }

        .pc-page-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0 0 16px;
        }

        .pc-tabs {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 0;
        }
        .pc-tab {
          padding: 10px 2px 12px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--pc-muted);
          text-decoration: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.2s, border-color 0.2s;
        }
        .pc-tab.active {
          color: var(--pc-text);
          border-bottom-color: var(--pc-cyan);
        }

        .pc-stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }
        .pc-stat-card {
          padding: 14px 16px;
          border-radius: 18px;
        }
        .pc-stat-card-accent {
          background: linear-gradient(
            135deg,
            rgba(34, 211, 238, 0.08),
            rgba(167, 139, 250, 0.1)
          );
        }
        .pc-stat-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--pc-muted);
        }
        .pc-stat-value {
          display: block;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-top: 4px;
        }
        .pc-stat-gradient {
          background: linear-gradient(90deg, var(--pc-cyan), var(--pc-violet));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .pc-contest {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          margin-bottom: 22px;
          border-radius: 18px;
        }
        .pc-contest-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }
        .pc-contest-body {
          flex: 1;
          min-width: 160px;
        }
        .pc-contest-tag {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #fbbf24;
        }
        .pc-contest-title {
          margin: 4px 0 0;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.35;
        }
        .pc-contest-sub {
          margin: 2px 0 0;
          font-size: 11px;
          color: var(--pc-muted);
        }
        .pc-contest-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pc-btn {
          padding: 9px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .pc-btn.primary {
          background: linear-gradient(135deg, #22d3ee, #6366f1);
          color: #0b0e14;
        }
        .pc-btn.ghost {
          background: rgba(255, 255, 255, 0.06);
          color: var(--pc-text);
          border: 1px solid var(--pc-border);
        }
        .pc-btn.ghost.light {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .pc-btn.primary.light {
          background: #fff;
          color: #0f172a;
        }

        .pc-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 22px 0 12px;
        }
        .pc-section-title {
          font-size: 15px;
          font-weight: 700;
          margin: 0;
        }
        .pc-section-actions {
          display: flex;
          gap: 6px;
        }
        .pc-link {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 12px;
          font-weight: 600;
          color: var(--pc-cyan);
          text-decoration: none;
        }
        .pc-hint {
          font-size: 12px;
          color: var(--pc-muted);
          margin: 0 0 10px;
          line-height: 1.5;
        }

        .pc-featured {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          min-height: 240px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 8px;
        }
        .pc-featured-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(
              160deg,
              rgba(15, 23, 42, 0.3) 0%,
              rgba(15, 23, 42, 0.85) 55%,
              rgba(11, 14, 20, 0.95) 100%
            ),
            linear-gradient(135deg, #1e3a5f 0%, #312e81 45%, #581c87 100%);
        }
        .pc-featured-glow {
          position: absolute;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.5;
          pointer-events: none;
        }
        .pc-featured-glow-left {
          top: 20%;
          left: 5%;
          background: var(--pc-cyan);
        }
        .pc-featured-glow-right {
          top: 10%;
          right: 5%;
          background: var(--pc-violet);
        }
        .pc-featured-content {
          position: relative;
          z-index: 2;
          padding: 20px;
          display: flex;
          flex-direction: column;
          min-height: 240px;
          justify-content: space-between;
        }
        .pc-featured-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .pc-featured-badge {
          font-size: 22px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transform: skewX(-6deg);
          text-shadow: 0 2px 20px rgba(34, 211, 238, 0.4);
        }
        .pc-live-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .pc-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          animation: pc-pulse 1.2s infinite;
        }
        .pc-featured-date {
          margin: 8px 0 0;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.65);
          font-weight: 500;
        }
        .pc-featured-teams {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 16px 0;
        }
        .pc-featured-team {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
          font-size: 12px;
          font-weight: 600;
        }
        .pc-featured-team-right {
          text-align: right;
        }
        .pc-team-badge {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .pc-team-badge-alt {
          background: linear-gradient(135deg, #10b981, #ca8a04);
        }
        .pc-featured-score {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 40px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }
        .pc-featured-score em {
          font-style: normal;
          font-size: 22px;
          color: rgba(255, 255, 255, 0.35);
          font-weight: 500;
        }
        .pc-featured-actions {
          display: flex;
          gap: 8px;
        }
        .pc-featured-actions .pc-btn {
          flex: 1;
        }

        .pc-date-block {
          margin-bottom: 14px;
        }
        .pc-date-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--pc-muted);
          text-transform: capitalize;
          margin: 0 0 8px 4px;
        }
        .pc-match-list {
          overflow: hidden;
          padding: 0;
        }
        .pc-match-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          padding: 14px 16px;
          text-decoration: none;
          color: inherit;
          transition: background 0.15s;
        }
        .pc-match-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .pc-match-row.bordered {
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .pc-match-side {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .pc-match-side-right {
          justify-content: flex-end;
          text-align: right;
        }
        .pc-match-emoji {
          font-size: 20px;
          line-height: 1;
          flex-shrink: 0;
        }
        .pc-match-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pc-match-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .pc-match-time {
          font-size: 15px;
          font-weight: 800;
          color: var(--pc-cyan);
        }
        .pc-match-stage {
          font-size: 9px;
          font-weight: 600;
          color: var(--pc-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .pc-empty {
          padding: 28px 20px;
          text-align: center;
          margin-bottom: 8px;
        }
        .pc-empty :global(.pc-empty-icon) {
          color: var(--pc-muted);
          margin-bottom: 10px;
          opacity: 0.6;
        }
        .pc-empty p {
          margin: 0 0 12px;
          font-size: 13px;
          color: var(--pc-muted);
        }

        .pc-standings {
          overflow: hidden;
          margin-bottom: 16px;
        }
        .pc-standings-head,
        .pc-standings-row {
          display: grid;
          grid-template-columns: 28px 1fr 72px 44px 36px;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          font-size: 12px;
        }
        .pc-standings-head {
          color: var(--pc-muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .pc-standings-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .pc-standings-row:last-child {
          border-bottom: none;
        }
        .pc-standings-row.pending {
          background: rgba(251, 191, 36, 0.06);
        }
        .pc-standings-empty {
          padding: 20px 14px;
          margin: 0;
          font-size: 12px;
          color: var(--pc-muted);
          text-align: center;
        }
        .col-team {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .pc-league-badge {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--pc-cyan), #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .pc-league-name {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .col-type {
          color: var(--pc-muted);
          font-size: 11px;
        }
        .col-pts {
          font-weight: 700;
          text-align: right;
          color: var(--pc-cyan);
        }
        .col-go {
          display: flex;
          justify-content: flex-end;
        }
        .pc-row-link {
          color: var(--pc-muted);
          text-decoration: none;
          display: flex;
          align-items: center;
        }
        .pc-row-link.warn {
          font-size: 11px;
          font-weight: 600;
          color: #fbbf24;
        }

        .pc-shortcuts {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }
        .pc-shortcut {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          text-decoration: none;
          color: var(--pc-text);
          font-size: 13px;
          font-weight: 600;
          border-radius: 16px;
        }
        .pc-shortcut :global(.pc-shortcut-arrow) {
          margin-left: auto;
          color: var(--pc-muted);
        }

        @media (min-width: 640px) {
          .pc-inner {
            max-width: 640px;
          }
          .pc-contest {
            flex-wrap: nowrap;
          }
        }
      `}</style>
    </div>
  );
}
