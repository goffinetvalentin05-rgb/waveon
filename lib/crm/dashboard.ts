import { migrateProspectStatus } from "@/lib/crm/status";
import { PIPELINE_COLUMNS, pipelineColumnId } from "@/lib/crm/pipeline";
import type { Prospect } from "@/lib/crm/types";

export type ActivityPoint = {
  date: string;
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

const EMAIL_TYPES = new Set(["mail_sent", "email"]);
const CALL_TYPES = new Set(["call_made", "call"]);
const MESSAGE_TYPES = new Set(["whatsapp", "message", "linkedin"]);
const FOLLOW_TYPES = new Set([
  "follow_up",
  "follow_up_1",
  "follow_up_2",
  "follow_up_3",
  "first_contact",
  "reply",
  "offer",
]);
const MEETING_TYPES = new Set(["meeting", "demo", "demo_scheduled", "demo_done"]);

/** Classe une activité CRM : uniquement le travail commercial réel. */
export function cadenceBucketForAction(
  actionType: string
): keyof Omit<ActivityPoint, "date"> | null {
  if (EMAIL_TYPES.has(actionType)) return "emails";
  if (CALL_TYPES.has(actionType)) return "calls";
  if (MESSAGE_TYPES.has(actionType) || FOLLOW_TYPES.has(actionType)) return "messages";
  if (MEETING_TYPES.has(actionType)) return "meetings";
  return null;
}

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
  return { date, emails: 0, calls: 0, messages: 0, meetings: 0 };
}

export function buildActivitySeries(
  days: number,
  activities: DashboardActivityRow[]
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

  for (const a of activities) {
    const bucket = map.get(dayKey(a.occurred_at || a.created_at));
    if (!bucket) continue;
    const field = cadenceBucketForAction(a.action_type);
    if (field) bucket[field] += 1;
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
