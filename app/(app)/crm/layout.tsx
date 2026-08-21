"use client";

import { usePathname } from "next/navigation";
import { CrmSubNav } from "@/components/app/CrmSubNav";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide =
    pathname === "/crm" ||
    Boolean(pathname?.match(/^\/crm\/prospects\/[^/]+/));

  return (
    <div>
      {hide ? null : <CrmSubNav />}
      {children}
    </div>
  );
}
