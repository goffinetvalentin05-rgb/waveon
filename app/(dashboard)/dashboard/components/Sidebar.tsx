"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { sidebarNavActive, sidebarNavInactive } from "@/lib/wavon/tokens";

const navItems = [
  { id: "overview", label: "Vue d'ensemble", href: "/dashboard" },
  { id: "reservations", label: "Réservations", href: "/dashboard/reservations" },
  { id: "availability", label: "Disponibilités", href: "/dashboard/disponibilites" },
  { id: "services", label: "Services", href: "/dashboard/services" },
  { id: "clients", label: "Clients", href: "/dashboard/clients" },
  { id: "diagnostics", label: "Diagnostics", href: "/dashboard/diagnostics" },
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
        <div className="flex items-center gap-2.5">
          <Image src="/waevon-logo.png" alt="Wavon" width={32} height={32} className="rounded-lg" />
          <div>
            <span className="text-sm font-semibold tracking-tight text-neutral-950">Wavon</span>
            <p className="text-[11px] text-neutral-500">Réservations</p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="wavon-mobile-nav"
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
            id="wavon-mobile-nav"
            className="absolute left-0 top-0 flex h-full w-[min(88vw,19rem)] flex-col border-r border-neutral-200/90 bg-white px-4 py-6 shadow-xl"
          >
            <div className="mb-8 flex items-center gap-3">
              <Image src="/waevon-logo.png" alt="" width={36} height={36} className="rounded-lg" />
              <div>
                <p className="text-sm font-semibold text-neutral-950">Wavon</p>
                <p className="text-xs text-neutral-500">Gestion de réservations</p>
              </div>
            </div>
            <NavLinks pathname={pathname} onNavigate={closeMobile} />
            <div className="mt-auto border-t border-neutral-100 pt-6">
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
        <div className="flex items-center gap-3 px-1">
          <Image src="/waevon-logo.png" alt="" width={40} height={40} className="rounded-xl" />
          <div>
            <p className="text-sm font-semibold tracking-tight text-neutral-950">Wavon</p>
            <p className="text-xs text-neutral-500">Gestion de réservations</p>
          </div>
        </div>

        <div className="mt-10 px-1">
          <NavLinks pathname={pathname} />
        </div>

        <div className="mt-auto border-t border-neutral-100 px-1 pt-6">
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
