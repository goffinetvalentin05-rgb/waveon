"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconBell,
  IconCalendarEvent,
  IconCash,
  IconChartBar,
  IconChecklist,
  IconFileText,
  IconHome,
  IconLanguage,
  IconLayoutDashboard,
  IconLock,
  IconLockOpen,
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
import { hasModule, PROJECT_MODULE_LABELS, type ProjectModuleKey } from "@/lib/projects/modules";
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
  personalLockEnabled: boolean;
  personalUnlocked: boolean;
  children: React.ReactNode;
};

const PROJECT_NAV: { key: ProjectModuleKey; href: (id: string) => string; icon: ModuleIcon; exact?: boolean }[] = [
  { key: "overview", href: (id) => `/projects/${id}`, icon: IconLayoutDashboard, exact: true },
  { key: "prospects", href: (id) => `/projects/${id}/prospects`, icon: IconUsers },
  { key: "tasks", href: (id) => `/projects/${id}/tasks`, icon: IconChecklist },
  { key: "calendar", href: (id) => `/projects/${id}/calendar`, icon: IconCalendarEvent },
  { key: "finances", href: (id) => `/projects/${id}/finances`, icon: IconCash },
  { key: "notes", href: (id) => `/projects/${id}/notes`, icon: IconNote },
  { key: "stats", href: (id) => `/projects/${id}/stats`, icon: IconChartBar },
  { key: "documents", href: (id) => `/projects/${id}/documents`, icon: IconFileText },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "W").toUpperCase();
}

function projectIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (!match) return null;
  if (match[1] === "unassigned") return "unassigned";
  return match[1];
}

export function AppShell({
  profile,
  projects,
  personalLockEnabled,
  personalUnlocked,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createProject, setCreateProject] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const activeProjects = projects.filter((p) => p.status === "active");
  const inPersonal = Boolean(pathname?.startsWith("/personal"));
  const currentProjectId = projectIdFromPath(pathname);
  const currentProject = currentProjectId
    ? activeProjects.find((p) => p.id === currentProjectId) ?? projects.find((p) => p.id === currentProjectId)
    : null;
  const inProject = Boolean(currentProjectId && currentProjectId !== "unassigned");

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

  const lockPersonal = async () => {
    await fetch("/api/personal/lock", { method: "POST" });
    router.push("/home");
    router.refresh();
  };

  const openSearch = () => window.dispatchEvent(new Event("waveone:search"));

  const nav = (() => {
    if (inPersonal) {
      return (
        <>
          <Link href="/home" onClick={() => setMobileOpen(false)} className="wo-nav-link mb-1">
            <IconArrowLeft className="h-4 w-4" stroke={1.6} />
            Accueil
          </Link>
          <NavSection label="Personnel">
            <SideLink
              href="/personal/calendar"
              label="Calendrier"
              icon={IconCalendarEvent}
              active={Boolean(pathname?.startsWith("/personal/calendar"))}
              onClick={() => setMobileOpen(false)}
            />
            <SideLink
              href="/personal/tasks"
              label="Tâches"
              icon={IconChecklist}
              active={Boolean(pathname?.startsWith("/personal/tasks"))}
              onClick={() => setMobileOpen(false)}
            />
            <SideLink
              href="/personal/english"
              label="Anglais"
              icon={IconLanguage}
              active={Boolean(pathname?.startsWith("/personal/english"))}
              onClick={() => setMobileOpen(false)}
            />
            <SideLink
              href="/personal/notes"
              label="Notes"
              icon={IconNote}
              active={Boolean(pathname?.startsWith("/personal/notes"))}
              onClick={() => setMobileOpen(false)}
            />
          </NavSection>
          {personalLockEnabled ? (
            <button type="button" onClick={() => void lockPersonal()} className="wo-nav-link mt-1 w-full">
              <IconLock className="h-[18px] w-[18px]" stroke={1.6} />
              Verrouiller
            </button>
          ) : null}
        </>
      );
    }

    if (inProject && currentProject) {
      return (
        <>
          <Link href="/projects" onClick={() => setMobileOpen(false)} className="wo-nav-link mb-1">
            <IconArrowLeft className="h-4 w-4" stroke={1.6} />
            Tous les projets
          </Link>
          <NavSection label={currentProject.name}>
            {PROJECT_NAV.filter((item) => hasModule(currentProject.enabledModules, item.key)).map((item) => (
              <SideLink
                key={item.key}
                href={item.href(currentProject.id)}
                label={PROJECT_MODULE_LABELS[item.key]}
                icon={item.icon}
                exact={item.exact}
                active={
                  item.exact
                    ? pathname === item.href(currentProject.id)
                    : Boolean(pathname?.startsWith(item.href(currentProject.id)))
                }
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </NavSection>
        </>
      );
    }

    return (
      <>
        <NavSection label="WaveOne">
          <SideLink
            href="/home"
            label="Accueil"
            icon={IconHome}
            active={pathname === "/home"}
            onClick={() => setMobileOpen(false)}
          />
        </NavSection>

        <NavSection label="Personnel">
          <SideLink
            href="/personal"
            label="Mon espace"
            icon={personalLockEnabled && !personalUnlocked ? IconLock : IconLockOpen}
            active={inPersonal}
            onClick={() => setMobileOpen(false)}
          />
        </NavSection>

        <NavSection
          label="Business"
          action={
            <button
              type="button"
              onClick={() => setCreateProject(true)}
              className="rounded-full p-1 text-[#6b7d76] transition hover:bg-white/[0.06] hover:text-[#eef6f2]"
              aria-label="Nouveau projet"
            >
              <IconPlus className="h-3.5 w-3.5" />
            </button>
          }
        >
          {activeProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              onClick={() => setMobileOpen(false)}
              className={`wo-nav-link ${pathname?.startsWith(`/projects/${p.id}`) ? "wo-nav-link-active" : ""}`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
                style={{ background: p.color ?? "#10b981", color: p.color ?? "#10b981" }}
              />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
          <button type="button" onClick={() => setCreateProject(true)} className="wo-nav-link w-full text-[#6b7d76]">
            <IconPlus className="h-[18px] w-[18px]" stroke={1.6} />
            Nouveau projet
          </button>
        </NavSection>
      </>
    );
  })();

  const chromeTitle = inPersonal ? "Personnel" : currentProject?.name ?? brand.shortName;

  return (
    <div className="wo-app min-h-screen lg:flex">
      <CommandPalette />
      <aside className="wo-sidebar fixed inset-y-3 left-3 z-40 hidden w-[var(--sidebar-width)] flex-col overflow-hidden rounded-[28px] lg:flex">
        <span className="wo-sidebar-inner-glow" aria-hidden />
        <div className="relative flex h-[64px] items-center justify-between px-4">
          <Link href="/home" className="group flex items-center gap-2.5">
            <span className="wo-brand-mark">W</span>
            <span className="font-display text-[15px] font-semibold tracking-tight text-[#eef6f2]">
              {brand.shortName}
            </span>
          </Link>
          <button
            type="button"
            className="wo-icon-btn"
            onClick={openSearch}
            aria-label="Recherche"
            title="Ctrl + K"
          >
            <IconSearch className="h-4 w-4" stroke={1.6} />
          </button>
        </div>

        <nav className="relative flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 py-1">{nav}</nav>

        <div className="relative mt-auto space-y-1.5 p-2.5 pb-3.5">
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
          <div className="wo-profile mt-1">
            <span className="wo-avatar">{initials(profile.displayName)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#eef6f2]">{profile.displayName}</p>
              <p className="truncate text-[11px] text-[#6b7d76]">{profile.email ?? "Compte personnel"}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="wo-icon-btn"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <IconLogout className="h-4 w-4" stroke={1.6} />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#06110e]/80 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/home" className="flex items-center gap-2">
          <span className="wo-brand-mark !h-7 !w-7">W</span>
          <span className="text-sm font-semibold text-[#eef6f2]">{chromeTitle}</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <button type="button" className="wo-icon-btn h-10 w-10" onClick={openSearch} aria-label="Recherche">
            <IconSearch className="h-5 w-5" stroke={1.6} />
          </button>
          <Link
            href="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#8a9e96] hover:bg-white/[0.05] hover:text-[#eef6f2]"
            aria-label="Notifications"
          >
            <IconBell className="h-5 w-5" stroke={1.6} />
            {notifCount > 0 ? (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            ) : null}
          </Link>
          <button
            type="button"
            className="wo-icon-btn h-10 w-10"
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
          <aside className="wo-sidebar absolute inset-y-2 left-2 flex w-72 flex-col overflow-hidden rounded-[24px]">
            <span className="wo-sidebar-inner-glow" aria-hidden />
            <div className="relative flex h-14 items-center justify-between px-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#eef6f2]">
                <span className="wo-brand-mark !h-7 !w-7">W</span>
                {brand.name}
              </span>
              <button type="button" className="wo-icon-btn" onClick={() => setMobileOpen(false)}>
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <nav className="relative flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">{nav}</nav>
            <div className="relative space-y-1 p-3">
              <SideLink
                href="/notifications"
                label="Notifications"
                icon={IconBell}
                active={Boolean(pathname?.startsWith("/notifications"))}
                badge={notifCount}
                onClick={() => setMobileOpen(false)}
              />
              <SideLink
                href="/settings"
                label="Paramètres"
                icon={IconSettings}
                active={Boolean(pathname?.startsWith("/settings"))}
                onClick={() => setMobileOpen(false)}
              />
              <button type="button" onClick={logout} className="wo-nav-link mt-1 w-full">
                <IconLogout className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="min-h-screen flex-1 pb-[4.5rem] lg:ml-[calc(var(--sidebar-width)+1.5rem)] lg:pb-0 lg:pt-3">
        <div className="sticky top-3 z-20 hidden items-center gap-3 px-6 py-0 lg:flex lg:px-8">
          <button type="button" className="wo-topbar-search" onClick={openSearch}>
            <IconSearch className="h-4 w-4 shrink-0" stroke={1.7} />
            <span className="flex-1 truncate text-left text-sm">Rechercher dans WaveOne…</span>
            <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-[#6b7d76] sm:inline">
              Ctrl K
            </kbd>
          </button>
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</div>
      </main>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/[0.06] bg-[#071412]/92 backdrop-blur-xl lg:hidden"
      >
        {[
          { href: "/home", label: "Accueil", icon: IconHome, match: "exact" as const },
          { href: "/personal", label: "Personnel", icon: IconLockOpen, match: "prefix" as const },
          { href: "/projects", label: "Projets", icon: IconLayoutDashboard, match: "prefix" as const },
          { href: "/notifications", label: "Alertes", icon: IconBell, match: "prefix" as const },
        ].map((item) => {
          const Icon = item.icon;
          const active =
            item.match === "exact" ? pathname === item.href : Boolean(pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition ${
                active ? "text-emerald-300" : "text-[#6b7d76]"
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
      <div className="mb-1.5 flex items-center justify-between px-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b7d76]">{label}</p>
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
    <Link href={href} onClick={onClick} className={`wo-nav-link ${active ? "wo-nav-link-active" : ""}`}>
      <Icon className={`wo-nav-icon h-[18px] w-[18px] ${active ? "text-emerald-300" : ""}`} stroke={1.6} />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-semibold tabular-nums text-emerald-200">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
