"use client";

import { IconCash, IconCreditCard, IconScale } from "@tabler/icons-react";
import { SubNav } from "@/components/ui/SubNav";

export default function FinancesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav
        ariaLabel="Navigation finances"
        items={[
          { href: "/finances", label: "Dépenses", icon: IconCash, exact: true },
          { href: "/finances/balances", label: "Qui doit quoi", icon: IconScale },
          { href: "/finances/subscriptions", label: "Abonnements", icon: IconCreditCard },
        ]}
      />
      {children}
    </div>
  );
}
