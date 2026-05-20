"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/tournament", label: "Tournoi" },
  { href: "/admin/tournament/teams", label: "Équipes" },
  { href: "/admin/tournament/matches", label: "Matchs" },
  { href: "/admin/contest", label: "Concours" },
  { href: "/admin/leagues", label: "Ligues" },
  { href: "/admin/cards", label: "Cartes (debug)" },
  { href: "/admin/payments", label: "Paiements" },
] as const;

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Administration">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`pc-admin-nav-link${isActive(pathname, n.href) ? " active" : ""}`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
