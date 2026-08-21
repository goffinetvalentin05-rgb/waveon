"use client";

import { IconCards, IconLanguage } from "@tabler/icons-react";
import { SubNav } from "@/components/ui/SubNav";

export default function PersonalEnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav
        ariaLabel="Navigation English"
        items={[
          { href: "/personal/english", label: "Vocabulaire", icon: IconLanguage, exact: true },
          { href: "/personal/english/review", label: "Flashcards", icon: IconCards },
        ]}
      />
      {children}
    </div>
  );
}
