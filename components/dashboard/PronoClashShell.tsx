"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/lib/supabase/client";
import { formatUserHandle, getAvatarLetter } from "@/lib/pronoclash/user-display";
import { IconLogout } from "@tabler/icons-react";
import "./pronoclash-dashboard.css";

const TABS = [
  { href: "/dashboard", label: "Explorer" },
  { href: "/matches", label: "Matchs" },
  { href: "/global/leaderboard", label: "Classement" },
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
  pageTitle: string;
  username?: string | null;
  email?: string | null;
  children: React.ReactNode;
};

export function PronoClashShell({ pageTitle, username, email, children }: PronoClashShellProps) {
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
        <header className="pc-header">
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
            <button type="button" className="pc-icon-btn" onClick={logout} aria-label="Se déconnecter">
              <IconLogout size={18} stroke={1.8} />
            </button>
          </div>
        </header>

        <h1 className="pc-page-title">{pageTitle}</h1>

        <nav className="pc-tabs" aria-label="Navigation principale">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pc-tab${navActive(pathname, tab.href) ? " active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  );
}
