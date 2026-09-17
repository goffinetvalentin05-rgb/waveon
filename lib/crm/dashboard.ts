import { migrateProspectStatus } from "@/lib/crm/status";
import { PIPELINE_COLUMNS, pipelineColumnId } from "@/lib/crm/pipeline";
import type { Prospect } from "@/lib/crm/types";

export type ActivityPoint = {
  date: string;
  prospects: number;
  emails: number;
  calls: number;
  messages: number;
  meetings: number;
};

export type DashboardActivityRow = {
  action_type: string;
  created_at: string;
  occurred_at?: string | null;
  title?: string | null;
  prospect_id?: string;
};

export type PipelineStageCount = {
  id: string;
  label: string;
  count: number;
  status: string;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function emptyPoint(date: string): ActivityPoint {
  return { date, prospects: 0, emails: 0, calls: 0, messages: 0, meetings: 0 };
}

export function buildActivitySeries(
  days: number,
  activities: DashboardActivityRow[],
  createdProspects: { created_at: string }[]
): ActivityPoint[] {
  const today = new Date();
  const points: ActivityPoint[] = [];
  const map = new Map<string, ActivityPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const point = emptyPoint(key);
    points.push(point);
    map.set(key, point);
  }

  for (const p of createdProspects) {
    const bucket = map.get(dayKey(p.created_at));
    if (bucket) bucket.prospects += 1;
  }

  for (const a of activities) {
    const key = dayKey(a.occurred_at || a.created_at);
    const bucket = map.get(key);
    if (!bucket) continue;
    const t = a.action_type;
    if (t === "created" || t === "imported") bucket.prospects += 1;
    else if (t === "mail_sent" || t === "email") bucket.emails += 1;
    else if (t === "call_made" || t === "call") bucket.calls += 1;
    else if (t === "whatsapp" || t === "message" || t === "linkedin") bucket.messages += 1;
    else if (t === "meeting" || t === "demo" || t === "demo_scheduled" || t === "demo_done") bucket.meetings += 1;
  }

  return points;
}

export function pipelineStageCounts(prospects: Pick<Prospect, "status">[]): PipelineStageCount[] {
  const groups = Object.fromEntries(PIPELINE_COLUMNS.map((c) => [c.id, 0])) as Record<string, number>;
  for (const p of prospects) {
    const id = pipelineColumnId(p as Prospect);
    groups[id] = (groups[id] ?? 0) + 1;
  }
  return PIPELINE_COLUMNS.filter((c) => c.id !== "closed").map((c) => ({
    id: c.id,
    label: c.label,
    count: groups[c.id] ?? 0,
    status: c.status,
  }));
}

export function formatChf(n: number): string {
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(n);
}

export function activityLabel(actionType: string, title?: string | null): string {
  if (title && !title.trim().startsWith("{")) return title;
  switch (actionType) {
    case "mail_sent":
    case "email":
      return "Email envoyé";
    case "created":
    case "imported":
      return "Prospect créé";
    case "follow_up":
    case "follow_up_1":
    case "follow_up_2":
    case "follow_up_3":
      return "Relance effectuée";
    case "demo_scheduled":
    case "meeting":
      return "Rendez-vous ajouté";
    case "client":
      return "Prospect devenu client";
    case "call":
    case "call_made":
      return "Appel enregistré";
    case "message":
    case "whatsapp":
      return "Message envoyé";
    case "status_change":
      return "Étape modifiée";
    default:
      return title || "Activité";
  }
}

export { migrateProspectStatus };
