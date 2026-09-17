export const MEETING_TYPES = ["rencontre", "demo", "rendez_vous", "visite", "autre"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  rencontre: "Rencontre",
  demo: "Démo",
  rendez_vous: "Rendez-vous commercial",
  visite: "Visite",
  autre: "Autre",
};

export type MeetingParticipant = {
  kind: "contact" | "member" | "free";
  id?: string | null;
  name: string;
};

export type MeetingNextAction = {
  text: string;
  owner?: string | null;
  due?: string | null;
  kind?: "task" | "follow_up" | "meeting" | null;
  uncertain?: boolean;
};

export type MeetingReport = {
  summary: string;
  discussed: string[];
  needs: string[];
  feedback: string[];
  objections: string[];
  decisions: string[];
  important: string[];
  next_actions: MeetingNextAction[];
  owners: string[];
  dates: string[];
  uncertain: string[];
};

export type MeetingRevision = {
  at: string;
  note?: string;
};

export type MeetingAttachment = {
  id: string;
  storage_path: string;
  mime_type: string | null;
  file_name: string | null;
  url?: string | null;
  created_at: string;
};

export type ProspectMeeting = {
  id: string;
  user_id: string;
  prospect_id: string;
  project_id: string | null;
  activity_id: string | null;
  title: string;
  meeting_type: MeetingType;
  occurred_at: string;
  participants: MeetingParticipant[];
  notes_free: string | null;
  report: MeetingReport;
  extracted_text: string | null;
  actions_created_count: number;
  revisions: MeetingRevision[];
  created_at: string;
  updated_at: string;
  attachments?: MeetingAttachment[];
};

export type MeetingParticipantOption = {
  kind: "contact" | "member";
  id: string;
  name: string;
};

export function emptyMeetingReport(): MeetingReport {
  return {
    summary: "",
    discussed: [],
    needs: [],
    feedback: [],
    objections: [],
    decisions: [],
    important: [],
    next_actions: [],
    owners: [],
    dates: [],
    uncertain: [],
  };
}

export function isMeetingType(value: string): value is MeetingType {
  return (MEETING_TYPES as readonly string[]).includes(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function asNextActions(value: unknown): MeetingNextAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { text } : null;
      }
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const text = String(row.text ?? row.title ?? "").trim();
      if (!text) return null;
      const kindRaw = String(row.kind ?? "").trim();
      const kind =
        kindRaw === "task" || kindRaw === "follow_up" || kindRaw === "meeting" ? kindRaw : null;
      return {
        text,
        owner: String(row.owner ?? "").trim() || null,
        due: String(row.due ?? row.due_date ?? "").trim() || null,
        kind,
        uncertain: Boolean(row.uncertain),
      };
    })
    .filter(Boolean) as MeetingNextAction[];
}

export function parseMeetingReport(value: unknown): MeetingReport {
  const base = emptyMeetingReport();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const row = value as Record<string, unknown>;
  return {
    summary: String(row.summary ?? "").trim(),
    discussed: asStringArray(row.discussed ?? row.points),
    needs: asStringArray(row.needs),
    feedback: asStringArray(row.feedback ?? row.returns),
    objections: asStringArray(row.objections ?? row.questions),
    decisions: asStringArray(row.decisions),
    important: asStringArray(row.important),
    next_actions: asNextActions(row.next_actions ?? row.nextActions),
    owners: asStringArray(row.owners ?? row.responsibles),
    dates: asStringArray(row.dates),
    uncertain: asStringArray(row.uncertain),
  };
}

export function parseParticipants(value: unknown): MeetingParticipant[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? ({ kind: "free" as const, name } satisfies MeetingParticipant) : null;
      }
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name ?? "").trim();
      if (!name) return null;
      const kindRaw = String(row.kind ?? "free");
      const kind: MeetingParticipant["kind"] =
        kindRaw === "contact" || kindRaw === "member" ? kindRaw : "free";
      return {
        kind,
        id: String(row.id ?? "").trim() || null,
        name,
      };
    })
    .filter(Boolean) as MeetingParticipant[];
}

export function parseMeetingRow(row: Record<string, unknown>): ProspectMeeting {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    prospect_id: String(row.prospect_id),
    project_id: row.project_id ? String(row.project_id) : null,
    activity_id: row.activity_id ? String(row.activity_id) : null,
    title: String(row.title ?? ""),
    meeting_type: isMeetingType(String(row.meeting_type ?? ""))
      ? (row.meeting_type as MeetingType)
      : "rencontre",
    occurred_at: String(row.occurred_at ?? row.created_at ?? ""),
    participants: parseParticipants(row.participants),
    notes_free: row.notes_free ? String(row.notes_free) : null,
    report: parseMeetingReport(row.report),
    extracted_text: row.extracted_text ? String(row.extracted_text) : null,
    actions_created_count: Number(row.actions_created_count ?? 0),
    revisions: Array.isArray(row.revisions)
      ? (row.revisions as MeetingRevision[]).filter((r) => r && typeof r.at === "string")
      : [],
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function participantNames(participants: MeetingParticipant[]): string {
  return participants.map((p) => p.name).filter(Boolean).join(", ");
}

export function meetingActionType(type: MeetingType): "meeting" | "demo" {
  return type === "demo" ? "demo" : "meeting";
}

export function meetingDetailHref(
  prospectId: string,
  meetingId: string,
  projectId?: string | null
): string {
  if (projectId) {
    return `/projects/${projectId}/prospects/${prospectId}/meetings/${meetingId}`;
  }
  return `/crm/prospects/${prospectId}/meetings/${meetingId}`;
}

export function linesToList(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

export function listToLines(items: string[]): string {
  return items.join("\n");
}
