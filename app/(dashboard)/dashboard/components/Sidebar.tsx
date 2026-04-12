"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { id: "overview", label: "Vue d'ensemble", href: "/dashboard" },
  { id: "prospects", label: "Mes prospects", href: "/dashboard/prospects" },
  { id: "conversations", label: "Conversations", href: "/dashboard/conversations" },
  { id: "bookings", label: "Appels bookés", href: "/dashboard/bookings" },
  { id: "agent", label: "Mon agent IA", href: "/dashboard/agent" },
  { id: "settings", label: "Paramètres", href: "/dashboard/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-[#39FF14]/15 lg:bg-[#0F0F0F] lg:px-6 lg:py-8">
      <div className="flex items-center gap-3">
        <Image src="/waevon-logo.png" alt="Waevon" width={36} height={36} />
        <div>
          <p className="text-lg font-semibold text-white">Waevon</p>
          <p className="text-xs text-white/60">Agent IA WhatsApp</p>
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
                  ? "border border-[#39FF14]/30 bg-[#39FF14]/10 text-[#39FF14]"
                  : "border border-transparent text-white/80 hover:border-[#39FF14]/20 hover:bg-[#39FF14]/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-[#39FF14]/20 bg-transparent px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-[#39FF14]/5 hover:text-white"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

