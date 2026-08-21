"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconBell,
  IconCalendarEvent,
  IconCash,
  IconChecklist,
  IconHome,
  IconLanguage,
  IconLogout,
  IconMenu2,
  IconNote,
  IconPlus,
  IconSearch,
  IconSettings,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { supabase } from "@/lib/supabase/client";
import { CommandPalette } from "@/components/search/CommandPalette";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import type { ModuleIcon } from "@/modules/types";
import type { Project } from "@/lib/projects/types";

export type AppProfile = {
  id: string;
  email: string | null;
  displayName: string;
};

type AppShellProps = {
  profile: AppProfile;
  projects: Project[];
  children: React.ReactNode;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "W").toUpperCase();
}

export function AppShell({ profile, projects, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createProject, setCreateProject] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const activeProjects = projects.filter((p) => p.status === "active");

  useEffect(() => {
    void fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifCount(d.count ?? 0))
      .catch(() => null);
  }, [pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const nav = (
    <>
      <NavSection label="WaveOne">
        <SideLink href="/home" label="Accueil" icon={IconHome} active={pathname === "/home"} exact />
      </NavSection>

      <NavSection label="Personnel">
        <SideLink
          href="/calendar"
          label="Calendrier"
          icon={IconCalendarEvent}
          active={Boolean(pathname?.startsWith("/calendar"))}
        />
        <SideLink
          href="/tasks"
          label="Tâches"
          icon={IconChecklist}
          active={Boolean(pathname?.startsWith("/tasks"))}
        />
        <SideLink
          href="/english"
          label="Anglais"
          icon={IconLanguage}
          active={Boolean(pathname?.startsWith("/english"))}
        />
        <SideLink
          href="/notes"
          label="Notes"
          icon={IconNote}
          active={Boolean(pathname?.startsWith("/notes"))}
        />
      </NavSection>

      <NavSection
        label="Projets"
        action={
          <button
            type="button"
            onClick={() => setCreateProject(true)}
            className="rounded-md p-0.5 text-[#6a6578] hover:bg-white/[0.06] hover:text-[#f3f0fa]"
            aria-label="Nouveau projet"
          >
            <IconPlus className="h-3.5 w-3.5" />
          </button>
        }
      >
        {activeProjects.slice(0, 8).map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            onClick={() => setMobileOpen(false)}
            className={`relative flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition ${
              pathname?.startsWith(`/projects/${p.id}`)
                ? "bg-violet-500/12 text-[#f3f0fa]"
                : "text-[#8b869c] hover:bg-white/[0.04] hover:text-[#f3f0fa]"
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color ?? "#8b5cf6" }} />
            <span className="truncate">{p.name}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setCreateProject(true)}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#6a6578] hover:bg-white/[0.04] hover:text-[#f3f0fa]"
        >
          <IconPlus className="h-[18px] w-[18px]" stroke={1.6} />
          Nouveau projet
        </button>
      </NavSection>

      <NavSection label="Business">
        <SideLink
          href="/crm"
          label="Prospects"
          icon={IconUsers}
          active={Boolean(pathname === "/crm" || pathname?.startsWith("/crm/"))}
          onClick={() => setMobileOpen(false)}
        />
        <SideLink
          href="/finances"
          label="Finances"
          icon={IconCash}
          active={Boolean(pathname?.startsWith("/finances"))}
          onClick={() => setMobileOpen(false)}
        />
      </NavSection>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0b0a10] lg:flex">
      <CommandPalette />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-white/[0.06] bg-[#0d0b13] lg:flex">
        <div className="flex h-[60px] items-center justify-between px-5">
          <Link href="/home" className="group flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-[11px] font-bold text-white">
              W
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[#f3f0fa]">
              {brand.shortName}
            </span>
          </Link>
          <button
            type="button"
            className="rounded-[10px] p-1.5 text-[#8b869c] hover:bg-white/[0.05] hover:text-[#f3f0fa]"
            onClick={() => window.dispatchEvent(new Event("waveone:search"))}
            aria-label="Recherche"
            title="Ctrl + K"
          >
            <IconSearch className="h-4 w-4" stroke={1.6} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-2">{nav}</nav>

        <div className="mt-auto space-y-1 border-t border-white/[0.06] p-2.5 pb-4">
          <SideLink
            href="/notifications"
            label="Notifications"
            icon={IconBell}
            active={Boolean(pathname?.startsWith("/notifications"))}
            badge={notifCount}
          />
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
              <p className="truncate text-[13px] font-medium text-[#f3f0fa]">{profile.displayName}</p>
              <p className="truncate text-[11px] text-[#6a6578]">{profile.email ?? "Compte personnel"}</p>
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
          <button
            type="button"
            className="rounded-[10px] p-2 text-[#8b869c] hover:bg-white/[0.05] hover:text-[#f3f0fa]"
            onClick={() => window.dispatchEvent(new Event("waveone:search"))}
            aria-label="Recherche"
          >
            <IconSearch className="h-5 w-5" stroke={1.6} />
          </button>
          <Link
            href="/notifications"
            className="relative rounded-[10px] p-2 text-[#8b869c] hover:bg-white/[0.05] hover:text-[#f3f0fa]"
            aria-label="Notifications"
          >
            <IconBell className="h-5 w-5" stroke={1.6} />
            {notifCount > 0 ? (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
            ) : null}
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
            <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">{nav}</nav>
            <div className="border-t border-white/[0.06] p-3">
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
        {[
          { href: "/home", label: "Accueil", icon: IconHome, match: "exact" as const },
          { href: "/tasks", label: "Tâches", icon: IconChecklist, match: "prefix" as const },
          { href: "/crm", label: "Prospects", icon: IconUsers, match: "prefix" as const },
          { href: "/calendar", label: "Agenda", icon: IconCalendarEvent, match: "prefix" as const },
          { href: "/finances", label: "Finances", icon: IconCash, match: "prefix" as const },
        ].map((item) => {
          const Icon = item.icon;
          const active =
            item.match === "exact" ? pathname === item.href : Boolean(pathname?.startsWith(item.href));
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

      {createProject ? (
        <ProjectFormModal
          onClose={() => setCreateProject(false)}
          onSaved={(project) => {
            setCreateProject(false);
            router.push(`/projects/${project.id}`);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function NavSection({
  label,
  children,
  action,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6a6578]">{label}</p>
        {action}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function SideLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  exact,
  badge,
}: {
  href: string;
  label: string;
  icon: ModuleIcon;
  active: boolean;
  onClick?: () => void;
  exact?: boolean;
  badge?: number;
}) {
  void exact;
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
        <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-violet-500" />
      ) : null}
      <Icon className={`h-[18px] w-[18px] ${active ? "text-violet-300" : ""}`} stroke={1.6} />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-full bg-violet-500/20 px-1.5 text-[10px] font-semibold tabular-nums text-violet-200">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
