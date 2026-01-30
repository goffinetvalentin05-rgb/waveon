"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type SidebarProps = {
  onCreateCampaign?: () => void;
};

const navItems = [
  { id: "overview", label: "Vue d'ensemble", href: "/dashboard" },
  { id: "campaigns", label: "Campagnes", href: "/campaigns" },
  { id: "new", label: "Nouvelle campagne", href: "/campaigns/new" },
  { id: "settings", label: "Paramètres", href: "/settings" },
];

export default function Sidebar({ onCreateCampaign }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-white/10 lg:bg-[#0f1020] lg:px-6 lg:py-8">
      <div className="flex items-center gap-3">
        <Image src="/logo_waveon.png" alt="WaveOn" width={36} height={36} />
        <div>
          <p className="text-lg font-semibold text-white">WaveOn</p>
          <p className="text-xs text-slate-400">Espace commerçant</p>
        </div>
      </div>

      <nav className="mt-10 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        {onCreateCampaign ? (
          <button
            type="button"
            onClick={onCreateCampaign}
            className="w-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(79,70,229,0.35)] transition hover:brightness-110"
          >
            Nouvelle campagne
          </button>
        ) : (
          <Link
            href="/campaigns/new"
            className="block w-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-[0_16px_40px_rgba(79,70,229,0.35)] transition hover:brightness-110"
          >
            Nouvelle campagne
          </Link>
        )}
        <div className="my-6 h-px bg-white/10" />
        <div className="space-y-2">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Retour au site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </aside>
  );
}

