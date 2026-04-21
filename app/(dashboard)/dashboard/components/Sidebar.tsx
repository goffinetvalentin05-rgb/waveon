"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { supabase } from "@/lib/supabase/client";
import { publicBookingAbsoluteUrl } from "@/lib/wavon/public-page-url";
import { normalizePublicSlugInput, validatePublicSlugFormat } from "@/lib/wavon/public-slug";
import { sidebarNavActive, sidebarNavInactive } from "@/lib/wavon/tokens";

const navItems = [
  { id: "overview", label: "Vue d'ensemble", href: "/dashboard" },
  { id: "calendar", label: "Calendrier", href: "/dashboard/calendrier" },
  { id: "services", label: "Services", href: "/dashboard/services" },
  { id: "clients", label: "Clients", href: "/dashboard/clients" },
  { id: "availability", label: "Disponibilités", href: "/dashboard/disponibilites" },
  { id: "settings", label: "Paramètres", href: "/dashboard/parametres" },
];

function NavLinks({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void;
  pathname: string | null;
}) {
  return (
    <nav className="space-y-0.5" aria-label="Navigation principale">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={isActive ? sidebarNavActive : sidebarNavInactive}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function SidebarFooterActions({ onNavigate }: { onNavigate?: () => void }) {
  const { ready, state } = useWavon();
  if (!ready) return null;
  const raw = state.settings.publicSlug?.trim() ?? "";
  const slugParsed = validatePublicSlugFormat(normalizePublicSlugInput(raw));
  const linkClassName =
    "flex w-full items-center gap-2 rounded-xl py-2.5 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950";

  if (slugParsed.ok) {
    return (
      <a
        href={publicBookingAbsoluteUrl(slugParsed.slug)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={linkClassName}
      >
        Voir ma page publique
        <ExternalLinkIcon className="shrink-0 opacity-70" />
      </a>
    );
  }
  return (
    <Link href="/dashboard/parametres?tab=mon-lien" onClick={onNavigate} className={linkClassName}>
      Définir mon lien de réservation
    </Link>
  );
}

function SidebarBrand({ compact }: { compact?: boolean }) {
  const { ready, state } = useWavon();
  const business = state.settings.businessName?.trim();
  if (!ready) {
    return (
      <div className={`flex items-center gap-3 ${compact ? "px-1" : "px-1"}`}>
        <div className="size-10 shrink-0 rounded-xl bg-neutral-100" />
        <div className="h-8 w-24 animate-pulse rounded bg-neutral-100" />
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-3 ${compact ? "px-1" : "px-1"}`}>
      <Image src="/waevon-logo.png" alt="Waevon" width={compact ? 36 : 40} height={compact ? 36 : 40} className="rounded-xl" />
      <div>
        <p className={`font-semibold tracking-tight text-neutral-950 ${compact ? "text-sm" : "text-sm"}`}>Waevon</p>
        {business ? (
          <p className={`text-neutral-500 ${compact ? "text-xs" : "text-xs"}`}>{business}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const closeMobile = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-neutral-200/80 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <SidebarBrand compact />
        <button
          type="button"
          aria-expanded={open}
          aria-controls="waevon-mobile-nav"
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border border-neutral-200/90 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
        >
          Menu
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-neutral-950/20 backdrop-blur-[1px]"
            onClick={closeMobile}
          />
          <aside
            id="waevon-mobile-nav"
            className="absolute left-0 top-0 flex h-full w-[min(88vw,19rem)] flex-col border-r border-neutral-200/90 bg-white px-4 py-6 shadow-xl"
          >
            <div className="mb-8">
              <SidebarBrand compact />
            </div>
            <NavLinks pathname={pathname} onNavigate={closeMobile} />
            <div className="mt-auto space-y-1 border-t border-neutral-100 pt-6">
              <SidebarFooterActions onNavigate={closeMobile} />
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  void handleLogout();
                }}
                className="w-full rounded-xl py-2.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="hidden w-[17.5rem] shrink-0 flex-col border-r border-neutral-200/80 bg-white px-4 py-8 lg:flex lg:px-5">
        <SidebarBrand />

        <div className="mt-10 px-1">
          <NavLinks pathname={pathname} />
        </div>

        <div className="mt-auto space-y-1 border-t border-neutral-100 px-1 pt-6">
          <SidebarFooterActions />
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full rounded-xl py-2.5 text-left text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}
