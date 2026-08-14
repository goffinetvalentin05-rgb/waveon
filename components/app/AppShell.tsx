"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconHome,
  IconLogout,
  IconMenu2,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { supabase } from "@/lib/supabase/client";
import { getNavModules } from "@/modules/registry";
import type { ModuleIcon } from "@/modules/types";

export type AppProfile = {
  id: string;
  email: string | null;
  displayName: string;
};

type AppShellProps = {
  profile: AppProfile;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: ModuleIcon;
  match: "exact" | "prefix";
};

const HOME_ITEM: NavItem = {
  href: "/home",
  label: "Dashboard",
  icon: IconHome,
  match: "exact",
};

function buildNav(): NavItem[] {
  const modules = getNavModules().map((m) => ({
    href: m.href,
    label: m.label,
    icon: m.icon,
    match: "prefix" as const,
  }));
  return [HOME_ITEM, ...modules];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "W").toUpperCase();
}

export function AppShell({ profile, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = buildNav();

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[#0b0a10] lg:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-white/[0.06] bg-[#0d0b13] lg:flex">
        <div className="flex h-[60px] items-center px-5">
          <Link href="/home" className="group flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-[11px] font-bold text-white">
              W
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[#f3f0fa]">
              {brand.shortName}
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
          {nav.map((item) => (
            <SideLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item)}
            />
          ))}
        </nav>

        <div className="mt-auto space-y-1 border-t border-white/[0.06] p-2.5 pb-4">
          <SideLink
            href="/settings"
            label="Paramètres"
            icon={IconSettings}
            active={Boolean(pathname?.startsWith("/settings"))}
          />
          <div className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-semibold text-violet-200">
              {initials(profile.displayName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#f3f0fa]">
                {profile.displayName}
              </p>
              <p className="truncate text-[11px] text-[#6a6578]">
                {profile.email ?? "Compte personnel"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#8b869c] transition hover:bg-white/[0.04] hover:text-[#f3f0fa]"
          >
            <IconLogout className="h-4 w-4" stroke={1.6} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0b0a10]/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/home" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-[11px] font-bold text-white">
            W
          </span>
          <span className="text-sm font-semibold text-[#f3f0fa]">{brand.shortName}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className="rounded-[10px] p-2 text-[#8b869c] hover:bg-white/[0.05] hover:text-[#f3f0fa]"
            aria-label="Paramètres"
          >
            <IconSettings className="h-5 w-5" stroke={1.6} />
          </Link>
          <button
            type="button"
            className="rounded-[10px] p-2 text-[#8b869c] hover:bg-white/[0.05] hover:text-[#f3f0fa]"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <IconMenu2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[#0d0b13]">
            <div className="flex h-14 items-center justify-between px-4">
              <span className="text-sm font-semibold text-[#f3f0fa]">{brand.name}</span>
              <button
                type="button"
                className="rounded-[10px] p-2 text-[#8b869c] hover:bg-white/[0.05]"
                onClick={() => setMobileOpen(false)}
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
              {nav.map((item) => (
                <SideLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(pathname, item)}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
            <div className="border-t border-white/[0.06] p-3">
              <div className="mb-2 flex items-center gap-2.5 px-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-semibold text-violet-200">
                  {initials(profile.displayName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#f3f0fa]">{profile.displayName}</p>
                  <p className="truncate text-xs text-[#6a6578]">{profile.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium text-[#8b869c] hover:bg-white/[0.04]"
              >
                <IconLogout className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="min-h-screen flex-1 pb-[4.5rem] lg:ml-[var(--sidebar-width)] lg:pb-0">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {children}
        </div>
      </main>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/[0.06] bg-[#0d0b13]/95 backdrop-blur-xl lg:hidden"
      >
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition ${
                active ? "text-violet-300" : "text-[#6a6578]"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" stroke={active ? 1.9 : 1.5} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function isActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/crm") {
    return pathname === "/crm" || pathname.startsWith("/crm/");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
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
  icon: ModuleIcon;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition ${
        active
          ? "bg-violet-500/12 text-[#f3f0fa]"
          : "text-[#8b869c] hover:bg-white/[0.04] hover:text-[#f3f0fa]"
      }`}
    >
      {active ? (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-violet-500" />
      ) : null}
      <Icon className={`h-[18px] w-[18px] ${active ? "text-violet-300" : ""}`} stroke={1.6} />
      {label}
    </Link>
  );
}
