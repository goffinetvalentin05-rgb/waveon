"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  IconBell,
  IconChevronDown,
  IconHome,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogout,
  IconMenu2,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { supabase } from "@/lib/supabase/client";
import { CommandPalette } from "@/components/search/CommandPalette";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { hasModule } from "@/lib/projects/modules";
import {
  BOTTOM_NAV,
  MOBILE_TABS,
  PERSONAL_NAV,
  PROJECT_NAV,
  isNavActive,
  pageMetaFromPath,
} from "@/lib/app/navigation";
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
  return (parts[0]?.slice(0, 2) ?? "W").toUpperCase();
}

function projectIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (!match || match[1] === "unassigned") return null;
  return match[1];
}

export function AppShell({ profile, projects, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createProject, setCreateProject] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeProjects = projects.filter((p) => p.status === "active");
  const currentProjectId = projectIdFromPath(pathname);
  const currentProject = currentProjectId
    ? activeProjects.find((p) => p.id === currentProjectId) ?? projects.find((p) => p.id === currentProjectId)
    : null;
  const inProject = Boolean(currentProject);
  const meta = pageMetaFromPath(pathname, currentProject?.name ?? null);
  const sidebarWidth = collapsed ? 80 : 260;

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

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("waveone.sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  };

  const openSearch = () => window.dispatchEvent(new Event("waveone:search"));

  const projectModules = useMemo(() => {
    if (!currentProject) return [];
    return PROJECT_NAV.filter((item) => {
      if (item.always) return true;
      if (!item.module) return true;
      return hasModule(currentProject.enabledModules, item.module);
    });
  }, [currentProject]);

  return (
    <div className="wo-app min-h-screen lg:flex">
      <CommandPalette />
      <aside
        className="wo-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden lg:flex"
        style={{ width: sidebarWidth }}
      >
        <SidebarBody
          compact={collapsed}
          pathname={pathname}
          activeProjects={activeProjects}
          currentProject={currentProject}
          projectModules={projectModules}
          onCollapse={toggleCollapsed}
          onCreateProject={() => setCreateProject(true)}
          onNavigate={() => {
            setMobileOpen(false);
            setSwitcherOpen(false);
          }}
          onLogout={logout}
        />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-wo-border bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/home" className="flex items-center gap-2">
          <span className="wo-brand-mark !h-7 !w-7">W</span>
          <span className="text-sm font-semibold text-wo-text">{currentProject?.name ?? brand.shortName}</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <button type="button" className="wo-icon-btn h-10 w-10" onClick={openSearch} aria-label="Recherche">
            <IconSearch className="h-5 w-5" stroke={1.6} />
          </button>
          <Link
            href="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-wo-muted hover:bg-wo-hover hover:text-wo-text"
            aria-label="Notifications"
          >
            <IconBell className="h-5 w-5" stroke={1.6} />
            {notifCount > 0 ? <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500" /> : null}
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer"
          />
          <aside className="wo-sidebar absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col overflow-hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-wo-text">
                <span className="wo-brand-mark !h-7 !w-7">W</span>
                {brand.name}
              </span>
              <button type="button" className="wo-icon-btn" onClick={() => setMobileOpen(false)}>
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <SidebarBody
              compact={false}
              pathname={pathname}
              activeProjects={activeProjects}
              currentProject={currentProject}
              projectModules={projectModules}
              onCreateProject={() => setCreateProject(true)}
              onNavigate={() => {
            setMobileOpen(false);
            setSwitcherOpen(false);
          }}
              onLogout={logout}
              hideCollapse
            />
          </aside>
        </div>
      ) : null}

      <main className={`min-h-screen flex-1 pb-[4.5rem] lg:pb-0 ${collapsed ? "lg:ml-[80px]" : "lg:ml-[260px]"}`}>
        <div className="hidden items-start justify-between gap-4 px-8 pt-7 lg:flex">
          <div className="min-w-0">
            {inProject && currentProject ? (
              <div className="relative mb-2 inline-block">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl border border-wo-border bg-white px-3 py-1.5 text-sm font-medium text-wo-text transition hover:bg-slate-50"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: currentProject.color ?? "#6366F1" }}
                  />
                  {currentProject.name}
                  <IconChevronDown className="h-4 w-4 text-wo-dim" />
                </button>
                {switcherOpen ? (
                  <div className="wo-modal absolute left-0 z-30 mt-2 w-60 overflow-hidden p-1">
                    {activeProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                          p.id === currentProject.id
                            ? "bg-wo-accent-soft text-wo-accent"
                            : "text-wo-secondary hover:bg-wo-hover"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? "#6366F1" }} />
                        {p.name}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSwitcherOpen(false);
                        setCreateProject(true);
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-wo-border px-3 py-2 text-sm text-wo-muted hover:bg-wo-hover hover:text-wo-text"
                    >
                      <IconPlus className="h-4 w-4" />
                      Nouveau projet
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <h1 className="wo-h1">{meta.title}</h1>
            {meta.subtitle ? <p className="mt-1 text-sm text-wo-muted">{meta.subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <button type="button" className="wo-topbar-search" onClick={openSearch}>
              <IconSearch className="h-4 w-4 shrink-0" stroke={1.7} />
              <span className="flex-1 truncate text-left text-sm">Rechercher…</span>
              <kbd className="hidden rounded-md border border-wo-border bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-wo-dim sm:inline">
                Ctrl K
              </kbd>
            </button>
            <Link href="/notifications" className="relative wo-icon-btn h-10 w-10" aria-label="Notifications">
              <IconBell className="h-5 w-5" stroke={1.6} />
              {notifCount > 0 ? (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
              ) : null}
            </Link>
            <Link href="/settings" className="wo-profile !gap-2.5 !py-1.5 !pl-1.5 !pr-3">
              <span className="wo-avatar">{initials(profile.displayName)}</span>
              <div className="min-w-0 text-left">
                <p className="truncate text-[13px] font-medium text-wo-text">{profile.displayName}</p>
                <p className="truncate text-[11px] text-wo-muted">{profile.email ?? "Compte"}</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:pt-6">
          <div className="mb-5 lg:hidden">
            <h1 className="wo-h1">{meta.title}</h1>
            {meta.subtitle ? <p className="mt-1 text-sm text-wo-muted">{meta.subtitle}</p> : null}
          </div>
          {children}
        </div>
      </main>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-wo-border bg-white/95 backdrop-blur-xl lg:hidden"
      >
        {MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href, item.match ?? "prefix");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition ${
                active ? "text-wo-accent" : "text-wo-dim"
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

function SidebarBody({
  compact,
  pathname,
  activeProjects,
  currentProject,
  projectModules,
  onCollapse,
  onCreateProject,
  onNavigate,
  onLogout,
  hideCollapse,
}: {
  compact: boolean;
  pathname: string | null;
  activeProjects: Project[];
  currentProject: Project | null | undefined;
  projectModules: typeof PROJECT_NAV;
  onCollapse?: () => void;
  onCreateProject: () => void;
  onNavigate: () => void;
  onLogout: () => void;
  hideCollapse?: boolean;
}) {
  return (
    <>
      <div className={`flex h-[64px] items-center ${compact ? "justify-center px-2" : "justify-between px-4"}`}>
        <Link href="/home" className="flex items-center gap-2.5" onClick={onNavigate}>
          <span className="wo-brand-mark">W</span>
          {compact ? null : (
            <span className="font-display text-[15px] font-semibold tracking-tight text-wo-text">{brand.shortName}</span>
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

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-1">
        <div>
          {compact ? null : <SectionLabel>Accueil</SectionLabel>}
          <SideLink
            href="/home"
            label="Tableau de bord"
            icon={IconHome}
            active={pathname === "/home"}
            compact={compact}
            onClick={onNavigate}
          />
        </div>

        <div>
          {compact ? null : <SectionLabel>Personnel</SectionLabel>}
          <div className="flex flex-col gap-0.5">
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
          </div>
        </div>

        <div>
          {compact ? null : (
            <SectionLabel
              action={
                <button
                  type="button"
                  onClick={onCreateProject}
                  className="rounded-lg p-1 text-wo-dim transition hover:bg-wo-hover hover:text-wo-text"
                  aria-label="Nouveau projet"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                </button>
              }
            >
              Projets
            </SectionLabel>
          )}
          <div className="flex flex-col gap-0.5">
            {activeProjects.map((project) => {
              const active = Boolean(pathname?.startsWith(`/projects/${project.id}`));
              return (
                <div key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    onClick={onNavigate}
                    title={project.name}
                    className={`wo-nav-link ${active ? "wo-nav-link-active" : ""} ${compact ? "justify-center px-0" : ""}`}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] leading-none"
                      style={{
                        background: active ? "rgba(255,255,255,0.18)" : `${project.color ?? "#6366F1"}22`,
                        color: active ? "#fff" : project.color ?? "#6366F1",
                      }}
                    >
                      {project.icon?.slice(0, 2) || project.name.slice(0, 1).toUpperCase()}
                    </span>
                    {compact ? null : <span className="truncate">{project.name}</span>}
                  </Link>
                  {active && !compact && currentProject ? (
                    <div className="mt-0.5 mb-1 flex flex-col gap-px">
                      {projectModules.map((item) => {
                        const href = `/projects/${project.id}${item.suffix}`;
                        const itemActive = item.exact ? pathname === href : Boolean(pathname?.startsWith(href));
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.key}
                            href={href}
                            onClick={onNavigate}
                            className={`wo-nav-sub ${itemActive ? "wo-nav-sub-active" : ""}`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" stroke={1.6} />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <button
              type="button"
              onClick={onCreateProject}
              className={`wo-nav-link w-full ${compact ? "justify-center px-0" : "text-wo-muted"}`}
              aria-label="Nouveau projet"
            >
              <IconPlus className="h-[18px] w-[18px]" stroke={1.6} />
              {compact ? null : "Nouveau projet"}
            </button>
          </div>
        </div>
      </nav>

      <div className="mt-auto space-y-1 p-3 pb-4">
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
          <IconLogout className="h-4 w-4" stroke={1.6} />
          {compact ? null : "Déconnexion"}
        </button>
      </div>
    </>
  );
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between px-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-wo-dim">{children}</p>
      {action}
    </div>
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
      <Icon className="wo-nav-icon h-[18px] w-[18px]" stroke={1.6} />
      {compact ? null : <span className="flex-1 truncate">{label}</span>}
    </Link>
  );
}
