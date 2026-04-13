"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { id: "overview", label: "Vue d'ensemble", href: "/dashboard" },
  { id: "reservations", label: "Réservations", href: "/dashboard/reservations" },
  { id: "availability", label: "Disponibilités", href: "/dashboard/disponibilites" },
  { id: "services", label: "Services", href: "/dashboard/services" },
  { id: "clients", label: "Clients", href: "/dashboard/clients" },
  { id: "conversations", label: "Conversations", href: "/dashboard/conversations" },
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
    <nav className="space-y-1">
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
            className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
              isActive
                ? "border border-emerald-500/35 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_-8px_rgba(34,197,94,0.35)]"
                : "border border-transparent text-white/80 hover:border-emerald-500/15 hover:bg-emerald-500/5 hover:text-white"
            }`}
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
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-emerald-500/10 bg-black/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <Image src="/waevon-logo.png" alt="Wavon" width={32} height={32} />
          <span className="font-semibold tracking-tight text-white">Wavon</span>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="wavon-mobile-nav"
          onClick={() => setOpen((o) => !o)}
          className="rounded-xl border border-emerald-500/25 px-3 py-2 text-sm text-white/90"
        >
          Menu
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeMobile}
          />
          <aside
            id="wavon-mobile-nav"
            className="absolute left-0 top-0 flex h-full w-[min(88vw,18rem)] flex-col border-r border-emerald-500/15 bg-[#050505] px-4 py-6 shadow-[0_0_40px_rgba(34,197,94,0.12)]"
          >
            <div className="mb-8 flex items-center gap-3">
              <Image src="/waevon-logo.png" alt="Wavon" width={36} height={36} />
              <div>
                <p className="text-lg font-semibold text-white">Wavon</p>
                <p className="text-xs text-white/55">Réservations</p>
              </div>
            </div>
            <NavLinks pathname={pathname} onNavigate={closeMobile} />
            <div className="mt-auto pt-6">
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  void handleLogout();
                }}
                className="w-full rounded-xl border border-emerald-500/25 bg-transparent px-3 py-2.5 text-sm font-medium text-white/85 transition hover:bg-emerald-500/5"
              >
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-500/10 bg-[#030303] px-5 py-8 lg:flex">
        <div className="flex items-center gap-3">
          <Image src="/waevon-logo.png" alt="Wavon" width={40} height={40} />
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">Wavon</p>
            <p className="text-xs text-white/55">Gestion de réservations</p>
          </div>
        </div>

        <div className="mt-10">
          <NavLinks pathname={pathname} />
        </div>

        <div className="mt-auto border-t border-emerald-500/10 pt-6">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full rounded-xl border border-emerald-500/25 bg-transparent px-3 py-2.5 text-sm font-medium text-white/85 transition hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-white"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}
