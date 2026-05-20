"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/app/Avatar";
import { supabase } from "@/lib/supabase/client";
import { isPronoClashShellPath } from "@/lib/pronoclash/shell-routes";

export type AppProfile = {
  id: string;
  username: string;
  avatarColor: string;
  isAdmin: boolean;
  totalPoints: number;
  email: string | null;
};

type AppShellProps = {
  profile: AppProfile;
  children: React.ReactNode;
};

const NAV = [
  { href: "/dashboard",   label: "Accueil",       icon: "home" as const },
  { href: "/matches",     label: "Matchs",        icon: "ball" as const },
  { href: "/leaderboard", label: "Classement",    icon: "trophy" as const },
];

export function AppShell({ profile, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const isPronoClashShell = isPronoClashShellPath(pathname);

  return (
    <div
      className={`relative min-h-screen ${isPronoClashShell ? "bg-[#050505] pb-24 lg:pb-8" : "pb-20 sm:pb-0"}`}
    >
      {!isPronoClashShell ? (
      <header className="sticky top-0 z-30 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
          </div>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.href} {...n} active={isActive(pathname, n.href)} />
            ))}
            {profile.isAdmin ? (
              <NavLink href="/admin" label="Admin" icon="cog" active={isActive(pathname, "/admin")} />
            ) : null}
          </nav>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 transition hover:border-white/20"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
            >
              <Avatar username={profile.username} colorId={profile.avatarColor} size="sm" />
              <span className="hidden text-sm font-semibold text-white sm:block">{profile.username}</span>
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-[#0b0d18] p-2 shadow-2xl backdrop-blur-xl"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-white">{profile.username}</div>
                  <div className="truncate text-xs text-white/40">{profile.email}</div>
                  <div className="mt-1 text-xs">
                    <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-semibold text-blue-200">
                      {profile.totalPoints} pts
                    </span>
                  </div>
                </div>
                <div className="my-1 h-px bg-white/5" />
                <MenuItem href="/dashboard">Mon dashboard</MenuItem>
                <MenuItem href="/leagues/new">Créer une ligue</MenuItem>
                {profile.isAdmin ? <MenuItem href="/admin">Espace admin</MenuItem> : null}
                <button
                  type="button"
                  onClick={logout}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  Se déconnecter
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      ) : null}

      <main
        className={
          isPronoClashShell
            ? "mx-auto w-full max-w-7xl p-0"
            : "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        }
      >
        {children}
      </main>

      {/* Bottom nav mobile — style glass flottant */}
      <nav
        className={`fixed inset-x-0 bottom-0 z-30 lg:hidden ${
          isPronoClashShell
            ? "mx-3 mb-3 rounded-2xl border border-white/10 bg-[#0b0e14]/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            : "border-t border-white/5 bg-black/70 backdrop-blur-xl"
        }`}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2">
          {NAV.map((n) => (
            <BottomLink key={n.href} {...n} active={isActive(pathname, n.href)} />
          ))}
          {profile.isAdmin ? (
            <BottomLink href="/admin" label="Admin" icon="cog" active={isActive(pathname, "/admin")} />
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/leaderboard") {
    return pathname === "/leaderboard" || pathname === "/global/leaderboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition ${
        active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      <NavIcon name={icon} />
      {label}
    </Link>
  );
}

function BottomLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
        active ? "text-white" : "text-white/55 hover:text-white"
      }`}
    >
      <NavIcon name={icon} className="h-5 w-5" />
      {label}
    </Link>
  );
}

function MenuItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}

type IconName = "home" | "ball" | "trophy" | "cog";

function NavIcon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-3v-7H10v7H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "ball":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3l3 6-3 5-3-5z M3 12l6 3 5-3-5-3z M21 12l-6 3-5-3 5-3z M12 21l-3-6 3-5 3 5z" strokeLinejoin="round" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z M3 6h4M21 6h-4" strokeLinecap="round" />
        </svg>
      );
    case "cog":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.8a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2L5.1 6 3 9.4l2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5L5.1 18l2.4-.8a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.8 2.1-3.4-2-1.5c0-.4.1-.8 0-1.2Z" />
        </svg>
      );
  }
}
