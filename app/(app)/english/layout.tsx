"use client";

import { IconCards, IconLanguage } from "@tabler/icons-react";
import { SubNav } from "@/components/ui/SubNav";

const ENGLISH_SUB_NAV = [
  { href: "/english", label: "Vocabulaire", icon: IconLanguage, exact: true },
  { href: "/english/review", label: "Flashcards", icon: IconCards },
];

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav items={ENGLISH_SUB_NAV} ariaLabel="Navigation English" />
      {children}
    </div>
  );
}
