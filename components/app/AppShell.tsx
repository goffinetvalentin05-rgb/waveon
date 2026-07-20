"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconChartBar,
  IconChecklist,
  IconLayoutDashboard,
  IconLogout,
  IconMenu2,
  IconSettings,
  IconUsers,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { supabase } from "@/lib/supabase/client";

export type AppProfile = {
  id: string;
  email: string | null;
  displayName: string;
};

type AppShellProps = {
  profile: AppProfile;
  children: React.ReactNode;
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/prospects", label: "Prospects", icon: IconUsers },
  { href: "/today", label: "Aujourd'hui", icon: IconChecklist },
  { href: "/clients", label: "Clients", icon: IconUserCheck },
  { href: "/stats", label: "Statistiques", icon: IconChartBar },
  { href: "/settings", label: "Paramètres", icon: IconSettings },
] as const;

export function AppShell({ profile, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-[#e8eef6] bg-white/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
              P
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">
              {brand.shortName}
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {NAV.map((item) => (
            <SideLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>

        <div className="border-t border-[#e8eef6] p-3">
          <div className="mb-2 truncate px-3 text-xs text-slate-400">
            {profile.email ?? profile.displayName}
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <IconLogout className="h-4 w-4" stroke={1.75} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e8eef6] bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            P
          </span>
          <span className="text-sm font-semibold text-slate-900">{brand.shortName}</span>
        </Link>
        <button
          type="button"
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <IconMenu2 className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between px-4">
              <span className="text-sm font-semibold text-slate-900">{brand.name}</span>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileOpen(false)}
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
              {NAV.map((item) => (
                <SideLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(pathname, item.href)}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
            <div className="border-t border-[#e8eef6] p-3">
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                <IconLogout className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="min-h-screen flex-1 lg:ml-[var(--sidebar-width)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/prospects") {
    return pathname === "/prospects" || pathname.startsWith("/prospects/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SideLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; stroke?: number }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" stroke={1.75} />
      {label}
    </Link>
  );
}
