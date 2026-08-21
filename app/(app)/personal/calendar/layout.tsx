"use client";

import { IconCake, IconCalendarEvent } from "@tabler/icons-react";
import { SubNav } from "@/components/ui/SubNav";

export default function PersonalCalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav
        ariaLabel="Navigation calendrier personnel"
        items={[
          { href: "/personal/calendar", label: "Calendrier", icon: IconCalendarEvent, exact: true },
          { href: "/personal/calendar/birthdays", label: "Anniversaires", icon: IconCake },
        ]}
      />
      {children}
    </div>
  );
}
