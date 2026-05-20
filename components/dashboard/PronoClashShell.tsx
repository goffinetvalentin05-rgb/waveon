"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconBallFootball,
  IconLayoutDashboard,
  IconLogout,
  IconTrophy,
} from "@tabler/icons-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/lib/supabase/client";
import { formatUserHandle, getAvatarLetter } from "@/lib/pronoclash/user-display";
import "./pronoclash-dashboard.css";

const NAV = [
  { href: "/dashboard", label: "Arène", icon: IconLayoutDashboard },
  { href: "/matches", label: "Matchs", icon: IconBallFootball },
  { href: "/global/leaderboard", label: "Classement", icon: IconTrophy },
] as const;

function navActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/global/leaderboard") {
    return pathname === "/global/leaderboard" || pathname === "/leaderboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type PronoClashShellProps = {
  pageTitle?: string;
  username?: string | null;
  email?: string | null;
  isAdmin?: boolean;
  /** Masque le titre H1 (dashboard avec hero intégré). */
  hidePageTitle?: boolean;
  children: React.ReactNode;
};

export function PronoClashShell({
  pageTitle,
  username,
  email,
  isAdmin = false,
  hidePageTitle = false,
  children,
}: PronoClashShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const letter = getAvatarLetter(username, email);
  const handle = formatUserHandle(username);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <div className="pc-wrap">
      <div className="pc-inner">
        <header className="pc-topbar">
          <div className="pc-header-left">
            <Logo href="/dashboard" size="sm" />
            <div className="pc-avatar" aria-hidden>
              {letter}
            </div>
            {handle ? (
              <div className="pc-user-pill">
                <span className="pc-user-handle">{handle}</span>
              </div>
            ) : null}
          </div>
          <div className="pc-header-actions">
            <button type="button" className="pc-icon-btn sm" onClick={logout} aria-label="Se déconnecter">
              <IconLogout size={16} stroke={1.8} />
            </button>
          </div>
        </header>

        <nav className="pc-nav-pills" aria-label="Navigation principale">
          {NAV.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`pc-nav-pill${navActive(pathname, tab.href) ? " active" : ""}`}
              >
                <Icon size={15} stroke={1.8} aria-hidden />
                {tab.label}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              href="/admin/tournament/matches"
              className={`pc-nav-pill pc-nav-pill-admin${
                pathname?.startsWith("/admin") ? " active" : ""
              }`}
            >
              Admin
            </Link>
          ) : null}
        </nav>

        {pageTitle && !hidePageTitle ? <h1 className="pc-page-title">{pageTitle}</h1> : null}

        {children}
      </div>
    </div>
  );
}
