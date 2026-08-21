"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ui } from "@/lib/design/tokens";
import type { ModuleIcon } from "@/modules/types";

export type SubNavItem = {
  href: string;
  label: string;
  icon: ModuleIcon;
  exact?: boolean;
};

export function SubNav({
  items,
  ariaLabel,
}: {
  items: readonly SubNavItem[] | SubNavItem[];
  ariaLabel: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={ariaLabel} className={ui.subNav}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition ${
              active ? ui.subNavActive : ui.subNavIdle
            }`}
          >
            <Icon className="h-4 w-4" stroke={1.6} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
