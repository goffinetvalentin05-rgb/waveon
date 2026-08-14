"use client";

import { IconCake, IconCalendarEvent } from "@tabler/icons-react";
import { SubNav } from "@/components/ui/SubNav";

const CALENDAR_SUB_NAV = [
  { href: "/calendar", label: "Calendrier", icon: IconCalendarEvent, exact: true },
  { href: "/calendar/birthdays", label: "Anniversaires", icon: IconCake },
] as const;

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav items={[...CALENDAR_SUB_NAV]} ariaLabel="Navigation Calendrier" />
      {children}
    </div>
  );
}
