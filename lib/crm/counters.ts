import { isClosedProspectStatus, isDemoStatus, isLostProspectStatus } from "@/lib/crm/closed";
import { migrateProspectStatus } from "@/lib/crm/status";

export type ProspectCounterRow = {
  status: string;
  next_follow_up: string | null;
};

export type ProspectWorkCounts = {
  all: number;
  toContact: number;
  followToday: number;
  overdue: number;
  noReply: number;
  replied: number;
  demoToPlan: number;
  demoScheduled: number;
  afterDemo: number;
  considering: number;
  offerSent: number;
  clients: number;
  lost: number;
  inDiscussion: number;
  relance1: number;
  relance2: number;
  closed: number;
};

export function countProspectWork(
  rows: ProspectCounterRow[],
  today: string
): ProspectWorkCounts {
  const counts: ProspectWorkCounts = {
    all: rows.length,
    toContact: 0,
    followToday: 0,
    overdue: 0,
    noReply: 0,
    replied: 0,
    demoToPlan: 0,
    demoScheduled: 0,
    afterDemo: 0,
    considering: 0,
    offerSent: 0,
    clients: 0,
    lost: 0,
    inDiscussion: 0,
    relance1: 0,
    relance2: 0,
    closed: 0,
  };

  for (const row of rows) {
    const status = migrateProspectStatus(row.status);
    const open = !isClosedProspectStatus(status);
    if (status === "À contacter") counts.toContact += 1;
    if (status === "Relance 1") counts.relance1 += 1;
    if (status === "Relance 2") counts.relance2 += 1;
    if (status === "En discussion") {
      counts.inDiscussion += 1;
      counts.considering += 1;
      counts.replied += 1;
    }
    if (isDemoStatus(status)) {
      counts.demoScheduled += 1;
    }
    if (status === "Client") counts.clients += 1;
    if (isLostProspectStatus(status)) {
      counts.lost += 1;
      counts.closed += 1;
    }
    if (open && row.next_follow_up === today) counts.followToday += 1;
    if (open && row.next_follow_up && row.next_follow_up < today) counts.overdue += 1;
  }

  return counts;
}
