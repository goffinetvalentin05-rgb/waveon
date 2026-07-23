"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCake, IconCalendarEvent } from "@tabler/icons-react";

const CALENDAR_SUB_NAV = [
  { href: "/calendar", label: "Calendrier", icon: IconCalendarEvent },
  { href: "/calendar/birthdays", label: "Anniversaires", icon: IconCake },
] as const;

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav
        aria-label="Navigation Calendrier"
        className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-[#e8eef6] bg-white/80 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm"
      >
        {CALENDAR_SUB_NAV.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/calendar" ? pathname === "/calendar" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" stroke={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
