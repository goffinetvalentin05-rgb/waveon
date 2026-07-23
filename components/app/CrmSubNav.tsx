"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CRM_SUB_NAV } from "@/modules/registry";

export function CrmSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation CRM"
      className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-[#e8eef6] bg-white/80 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm"
    >
      {CRM_SUB_NAV.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
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
  );
}
