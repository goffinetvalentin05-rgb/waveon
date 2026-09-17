"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconBell,
  IconCheck,
  IconFolders,
  IconHome,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogout,
  IconMenu2,
  IconPlus,
  IconSearch,
  IconSelector,
  IconSettings,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { supabase } from "@/lib/supabase/client";
import { CommandPalette } from "@/components/search/CommandPalette";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { ProjectAvatar } from "@/components/projects/ProjectAvatar";
import { hasModule } from "@/lib/projects/modules";
import {
  BOTTOM_NAV,
  PERSONAL_NAV,
  PROJECT_MORE_NAV,
  PROJECT_PRIMARY_NAV,
  isNavActive,
  isProjectNavActive,
  pageMetaFromPath,
  type ProjectNavItem,
} from "@/lib/app/navigation";
import {
  ACTIVE_PROJECT_STORAGE_KEY,
  SIDEBAR_COLLAPSED_KEY,
  useStoredFlag,
  useStoredId,
  writeStoredId,
} from "@/lib/app/workspace";
import type { Project } from "@/lib/projects/types";
import type { ModuleIcon } from "@/modules/types";

export type AppProfile = {
  id: string;
  email: string | null;
  displayName: string;
};

type AppShellProps = {
  profile: AppProfile;
  projects: Project[];
  personalLockEnabled?: boolean;
  personalUnlocked?: boolean;
  children: React.ReactNode;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "R").toUpperCase();
}

function projectIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (!match || match[1] === "unassigned") return null;
  return match[1];
}

function suffixForPath(pathname: string | null, projectId: string): string {
  if (!pathname) return "";
  const prefix = `/projects/${projectId}`;
  if (!pathname.startsWith(prefix)) return "";
  const rest = pathname.slice(prefix.length);
  if (rest.startsWith("/prospects/")) return "/prospects";
  return rest || "";
}

export function AppShell({ profile, projects, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createProject, setCreateProject] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [collapsed, setCollapsed] = useStoredFlag(SIDEBAR_COLLAPSED_KEY);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const storedWorkspaceId = useStoredId(ACTIVE_PROJECT_STORAGE_KEY);
  const switcherRef = useRef<HTMLDivElement>(null);

  const activeProjects = projects.filter((p) => p.status === "active");
  const pathProjectId = projectIdFromPath(pathname);
  const workspaceId =
    pathProjectId ??
    (storedWorkspaceId && activeProjects.some((p) => p.id === storedWorkspaceId)
      ? storedWorkspaceId
      : activeProjects[0]?.id ?? null);

  useEffect(() => {
    if (pathProjectId) writeStoredId(ACTIVE_PROJECT_STORAGE_KEY, pathProjectId);
  }, [pathProjectId]);

  const currentProject = workspaceId
    ? activeProjects.find((p) => p.id === workspaceId) ?? projects.find((p) => p.id === workspaceId)
    : null;
  const meta = pageMetaFromPath(pathname, currentProject?.name ?? null);
  const sidebarWidth = collapsed ? 76 : 244;
  const ravenHref =
    activeProjects.length > 1 ? "/projects" : currentProject ? `/projects/${currentProject.id}` : "/home";

  useEffect(() => {
    void fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifCount(d.count ?? 0))
      .catch(() => null);
  }, [pathname]);

  useEffect(() => {
    if (!switcherOpen) return;
    const onClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [switcherOpen]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const openSearch = () => window.dispatchEvent(new Event("waveone:search"));

  const visiblePrimary = useMemo(() => {
    if (!currentProject) return [];
    return PROJECT_PRIMARY_NAV.filter((item) => {
      if (item.always) return true;
      if (!item.module) return true;
      return hasModule(currentProject.enabledModules, item.module);
    });
  }, [currentProject]);

  const switchProject = (project: Project) => {
    const suffix = currentProject ? suffixForPath(pathname, currentProject.id) : "";
    const allowed = PROJECT_PRIMARY_NAV.concat(PROJECT_MORE_NAV).some((item) => {
      const s = item.suffix || "";
      if (!suffix || suffix === s) {
        if (item.always) return true;
        if (!item.module) return true;
        return hasModule(project.enabledModules, item.module);
      }
      return false;
    });
    writeStoredId(ACTIVE_PROJECT_STORAGE_KEY, project.id);
    setSwitcherOpen(false);
    router.push(`/projects/${project.id}${allowed ? suffix : ""}`);
  };

  const sidebarProps = {
    compact: collapsed,
    pathname,
    activeProjects,
    currentProject: currentProject ?? null,
    visiblePrimary,
    ravenHref,
    onCollapse: () => setCollapsed(!collapsed),
    onCreateProject: () => setCreateProject(true),
    onNavigate: () => {
      setMobileOpen(false);
      setSwitcherOpen(false);
    },
    onLogout: logout,
    switcherOpen,
    setSwitcherOpen,
    switcherRef,
    onSwitchProject: switchProject,
  };

  return (
    <div className="wo-app min-h-screen lg:flex">
      <CommandPalette />
      <aside
        className="wo-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden lg:flex"
        style={{ width: sidebarWidth }}
      >
        <SidebarBody {...sidebarProps} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-wo-border bg-[#0b0907]/85 px-4 backdrop-blur-xl lg:hidden">
        <Link href={ravenHref} className="flex items-center gap-2.5">
          <span className="wo-brand-mark !h-8 !w-8">R</span>
          <span className="text-sm font-semibold text-wo-text">{currentProject?.name ?? brand.shortName}</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <button type="button" className="wo-icon-btn h-10 w-10" onClick={openSearch} aria-label="Recherche">
            <IconSearch className="h-5 w-5" stroke={1.6} />
          </button>
          <Link href="/notifications" className="relative wo-icon-btn h-10 w-10" aria-label="Notifications">
            <IconBell className="h-5 w-5" stroke={1.6} />
            {notifCount > 0 ? <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-wo-accent" /> : null}
          </Link>
          <button type="button" className="wo-icon-btn h-10 w-10" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <IconMenu2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer"
          />
          <aside className="wo-sidebar absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col overflow-hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <Link href={ravenHref} className="flex items-center gap-2.5 text-sm font-semibold text-wo-text" onClick={() => setMobileOpen(false)}>
                <span className="wo-brand-mark !h-8 !w-8">R</span>
                {brand.name}
              </Link>
              <button type="button" className="wo-icon-btn" onClick={() => setMobileOpen(false)}>
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <SidebarBody {...sidebarProps} compact={false} hideCollapse />
          </aside>
        </div>
      ) : null}

      <main className={`min-h-screen flex-1 pb-[4.5rem] lg:pb-0 ${collapsed ? "lg:ml-[76px]" : "lg:ml-[244px]"}`}>
        <div className="sticky top-0 z-30 hidden h-[72px] items-center justify-between gap-6 border-b border-wo-border bg-[#0b0907]/70 px-8 backdrop-blur-xl lg:flex">
          <div className="min-w-0">
            {meta.hideTitle ? null : (
              <>
                <h1 className="truncate font-display text-[1.35rem] font-semibold tracking-tight text-wo-text">
                  {meta.title}
                </h1>
                {meta.subtitle ? <p className="truncate text-[12.5px] text-wo-dim">{meta.subtitle}</p> : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="wo-topbar-search" onClick={openSearch}>
              <IconSearch className="h-4 w-4 shrink-0" stroke={1.7} />
              <span className="flex-1 truncate text-left text-[13px]">Rechercher un prospect…</span>
              <kbd className="hidden rounded-full border border-wo-border bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-wo-dim sm:inline">
                ⌘K
              </kbd>
            </button>
            <Link href="/notifications" className="relative wo-icon-btn" aria-label="Notifications">
              <IconBell className="h-[18px] w-[18px]" stroke={1.6} />
              {notifCount > 0 ? (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-wo-accent shadow-[0_0_8px_rgba(217,119,50,0.9)]" />
              ) : null}
            </Link>
            <Link href="/settings" className="wo-profile">
              <span className="wo-avatar">{initials(profile.displayName)}</span>
              <div className="min-w-0 text-left">
                <p className="truncate text-[13px] font-medium text-wo-text">{profile.displayName}</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {meta.hideTitle ? null : (
            <div className="mb-5 lg:hidden">
              <h1 className="wo-h1">{meta.title}</h1>
              {meta.subtitle ? <p className="mt-1 text-[13px] text-wo-dim">{meta.subtitle}</p> : null}
            </div>
          )}
          {children}
        </div>
      </main>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-wo-border bg-[#0d0b09]/95 backdrop-blur-xl lg:hidden"
      >
        {[
          {
            href: currentProject ? `/projects/${currentProject.id}` : "/home",
            label: "Dashboard",
            icon: IconHome,
            active: Boolean(pathname && /^\/projects\/[^/]+$/.test(pathname)),
          },
          {
            href: currentProject ? `/projects/${currentProject.id}/prospects` : "/projects",
            label: "Prospects",
            icon: IconUsers,
            active: Boolean(pathname?.includes("/prospects")),
          },
          {
            href: "/projects",
            label: "Projets",
            icon: IconFolders,
            active: pathname === "/projects",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition ${
                item.active ? "text-wo-accent" : "text-wo-dim"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" stroke={item.active ? 1.9 : 1.5} />
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
            writeStoredId(ACTIVE_PROJECT_STORAGE_KEY, project.id);
            router.push(`/projects/${project.id}`);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function SidebarBody({
  compact,
  pathname,
  activeProjects,
  currentProject,
  visiblePrimary,
  ravenHref,
  onCollapse,
  onCreateProject,
  onNavigate,
  onLogout,
  hideCollapse,
  switcherOpen,
  setSwitcherOpen,
  switcherRef,
  onSwitchProject,
}: {
  compact: boolean;
  pathname: string | null;
  activeProjects: Project[];
  currentProject: Project | null;
  visiblePrimary: ProjectNavItem[];
  ravenHref: string;
  onCollapse?: () => void;
  onCreateProject: () => void;
  onNavigate: () => void;
  onLogout: () => void;
  hideCollapse?: boolean;
  switcherOpen: boolean;
  setSwitcherOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  switcherRef: React.RefObject<HTMLDivElement | null>;
  onSwitchProject: (project: Project) => void;
}) {
  const base = currentProject ? `/projects/${currentProject.id}` : null;
  const closeSwitcher = () => setSwitcherOpen(false);

  return (
    <>
      <div className={`flex h-[72px] items-center ${compact ? "justify-center px-2" : "justify-between px-4"}`}>
        <Link href={ravenHref} className="flex min-w-0 items-center gap-2.5" onClick={onNavigate}>
          <span className="wo-brand-mark">R</span>
          {compact ? null : (
            <span className="min-w-0">
              <span className="block font-display text-[16px] font-semibold leading-tight tracking-tight text-white">
                {brand.shortName}
              </span>
              <span className="block text-[10.5px] font-medium uppercase tracking-[0.14em] text-wo-dim">
                {brand.tagline}
              </span>
            </span>
          )}
        </Link>
        {!compact && !hideCollapse && onCollapse ? (
          <button type="button" className="wo-icon-btn hidden lg:inline-flex" onClick={onCollapse} aria-label="Réduire">
            <IconLayoutSidebarLeftCollapse className="h-4 w-4" stroke={1.6} />
          </button>
        ) : null}
      </div>

      {compact && onCollapse ? (
        <div className="flex justify-center pb-2">
          <button type="button" className="wo-icon-btn" onClick={onCollapse} aria-label="Déplier">
            <IconLayoutSidebarLeftExpand className="h-4 w-4" stroke={1.6} />
          </button>
        </div>
      ) : null}

      <div className={compact ? "px-2 pb-3" : "px-3 pb-4"} ref={switcherRef}>
        {currentProject ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              title={currentProject.name}
              className={`wo-project-switch ${compact ? "justify-center !px-0" : ""}`}
            >
              <ProjectAvatar project={currentProject} size="sm" />
              {compact ? null : (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-wo-dim">
                      Projet
                    </span>
                    <span className="block truncate text-[13.5px] font-semibold text-white">
                      {currentProject.name}
                    </span>
                  </span>
                  <IconSelector className="h-4 w-4 shrink-0 text-wo-dim" stroke={1.7} />
                </>
              )}
            </button>
            {switcherOpen ? (
              <div className="wo-modal absolute left-0 z-40 mt-2 w-[min(18.5rem,calc(100vw-2rem))] overflow-hidden p-1.5">
                <p className="px-2.5 pb-1.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-wo-dim">
                  Mes projets
                </p>
                <div className="max-h-64 overflow-y-auto">
                  {activeProjects.map((p) => {
                    const active = p.id === currentProject.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSwitchProject(p)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition ${
                          active
                            ? "bg-wo-accent-soft text-wo-accent"
                            : "text-wo-secondary hover:bg-white/[0.05]"
                        }`}
                      >
                        <ProjectAvatar project={p} size="xs" />
                        <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                        {active ? <IconCheck className="h-3.5 w-3.5 shrink-0" stroke={2.2} /> : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 border-t border-wo-border pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      closeSwitcher();
                      onCreateProject();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-wo-muted transition hover:bg-white/[0.04] hover:text-wo-text"
                  >
                    <IconPlus className="h-4 w-4" />
                    Nouveau projet
                  </button>
                  <Link
                    href="/projects?manage=1"
                    onClick={() => {
                      closeSwitcher();
                      onNavigate();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-wo-muted transition hover:bg-white/[0.04] hover:text-wo-text"
                  >
                    <IconSettings className="h-4 w-4" />
                    Gérer les projets
                  </Link>
                  <Link
                    href="/projects"
                    onClick={() => {
                      closeSwitcher();
                      onNavigate();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-wo-muted transition hover:bg-white/[0.04] hover:text-wo-text"
                  >
                    <IconFolders className="h-4 w-4" />
                    Tous les projets
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        ) : compact ? (
          <button type="button" onClick={onCreateProject} className="wo-nav-link w-full justify-center px-0">
            <IconPlus className="h-[18px] w-[18px]" stroke={1.6} />
          </button>
        ) : (
          <button type="button" onClick={onCreateProject} className="wo-btn wo-btn-primary w-full">
            <IconPlus className="h-4 w-4" />
            Créer un projet
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 pb-2">
        {currentProject ? (
          <>
            {compact ? null : <SectionLabel>Prospection</SectionLabel>}
            <div className="flex flex-col gap-0.5">
              {visiblePrimary.map((item) => {
                const href = `${base}${item.suffix}`;
                return (
                  <SideLink
                    key={item.key}
                    href={href}
                    label={item.label}
                    icon={item.icon}
                    active={isProjectNavActive(pathname, href, item.exact)}
                    compact={compact}
                    onClick={onNavigate}
                  />
                );
              })}
            </div>
          </>
        ) : null}
      </nav>

      <div className="mt-auto space-y-1 border-t border-wo-border px-2.5 py-3">
        {PERSONAL_NAV.map((item) => (
          <SideLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavActive(pathname, item.href, item.match ?? "prefix")}
            compact={compact}
            onClick={onNavigate}
          />
        ))}
        {BOTTOM_NAV.map((item) => (
          <SideLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavActive(pathname, item.href, item.match ?? "prefix")}
            compact={compact}
            onClick={onNavigate}
          />
        ))}
        <button
          type="button"
          onClick={onLogout}
          className={`wo-nav-link w-full ${compact ? "justify-center px-0" : ""}`}
          aria-label="Se déconnecter"
        >
          <IconLogout className="wo-nav-icon h-[17px] w-[17px]" stroke={1.6} />
          {compact ? null : <span className="flex-1 truncate text-left">Déconnexion</span>}
        </button>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-wo-dim">{children}</p>
  );
}

function SideLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  compact,
}: {
  href: string;
  label: string;
  icon: ModuleIcon;
  active: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={label}
      className={`wo-nav-link ${active ? "wo-nav-link-active" : ""} ${compact ? "justify-center px-0" : ""}`}
    >
      <Icon className="wo-nav-icon h-[17px] w-[17px] shrink-0" stroke={1.7} />
      {compact ? null : <span className="flex-1 truncate">{label}</span>}
    </Link>
  );
}
