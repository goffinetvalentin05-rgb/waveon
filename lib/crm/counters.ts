import { isClosedProspectStatus, isDemoScheduledStatus } from "@/lib/crm/closed";
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
};

export function countProspectWork(
  rows: ProspectCounterRow[],
  today: string
): ProspectWorkCounts {
  const counts: ProspectWorkCounts = {
    all: rows.filter((r) => migrateProspectStatus(r.status) !== "Client").length,
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
  };

  for (const row of rows) {
    const status = migrateProspectStatus(row.status);
    const open = !isClosedProspectStatus(status);
    if (status === "À contacter") counts.toContact += 1;
    if (status === "Sans réponse") counts.noReply += 1;
    if (status === "Réponse reçue") counts.replied += 1;
    if (status === "Démo à planifier") counts.demoToPlan += 1;
    if (isDemoScheduledStatus(status)) counts.demoScheduled += 1;
    if (status === "À relancer après démo") counts.afterDemo += 1;
    if (status === "En réflexion") counts.considering += 1;
    if (status === "Offre / prix envoyé") counts.offerSent += 1;
    if (status === "Client") counts.clients += 1;
    if (status === "Pas maintenant" || status === "Pas intéressé" || status === "Perdu") counts.lost += 1;
    if (open && row.next_follow_up === today) counts.followToday += 1;
    if (open && row.next_follow_up && row.next_follow_up < today) counts.overdue += 1;
  }

  return counts;
}
