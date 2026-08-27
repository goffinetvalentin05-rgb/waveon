export const PROSPECT_STATUS_PHASES = [
  {
    id: "prospection" as const,
    label: "Prospection",
    statuses: ["À contacter", "Relance 1", "Relance 2"],
  },
  {
    id: "discussion" as const,
    label: "Avancement",
    statuses: ["En discussion", "Démo"],
  },
  {
    id: "result" as const,
    label: "Résultat",
    statuses: ["Client", "Fermé"],
  },
] as const;

export const PROSPECT_STATUSES = PROSPECT_STATUS_PHASES.flatMap((p) => [...p.statuses]);

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export function isProspectStatus(value: string): value is ProspectStatus {
  return (PROSPECT_STATUSES as readonly string[]).includes(value);
}

export const ACTION_TYPES = [
  "mail_sent",
  "call_made",
  "demo_scheduled",
  "client",
  "refus",
  "note",
  "status_change",
  "imported",
  "created",
  "archived",
  "restored",
  "call",
  "whatsapp",
  "email",
  "linkedin",
  "meeting",
  "demo",
  "other",
  "first_contact",
  "follow_up",
  "reply",
  "offer",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const INTERACTION_TYPES = [
  "first_contact",
  "follow_up",
  "call",
  "whatsapp",
  "email",
  "linkedin",
  "reply",
  "meeting",
  "demo",
  "offer",
  "note",
  "other",
] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  first_contact: "Premier contact",
  follow_up: "Relance",
  call: "Appel",
  whatsapp: "WhatsApp",
  email: "Email",
  linkedin: "LinkedIn",
  reply: "Réponse",
  meeting: "Réunion",
  demo: "Démo",
  offer: "Offre",
  note: "Note",
  other: "Autre",
};

export const CONTACT_CHANNELS = [
  "WhatsApp",
  "Email",
  "Téléphone",
  "LinkedIn",
  "Visite",
  "Autre",
] as const;

export const TASK_KINDS = ["follow_up", "first_contact", "demo", "custom"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export type Prospect = {
  id: string;
  user_id: string;
  club_name: string;
  sport: string | null;
  canton: string | null;
  ville: string | null;
  contact_name: string | null;
  contact_function: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url?: string | null;
  address?: string | null;
  country?: string | null;
  linkedin_url?: string | null;
  source?: string | null;
  priority?: "Faible" | "Normale" | "Haute" | "Urgente" | null;
  status: ProspectStatus;
  last_action: string | null;
  last_action_at: string | null;
  next_follow_up: string | null;
  next_action: string | null;
  notes: string | null;
  demo_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  assigned_to: string | null;
  potential_value: number | null;
  contact_channel: string | null;
  tags: string[];
  closed_reason: string | null;
  closed_note: string | null;
  legacy_status: string | null;
  contact_count?: number;
  people_count?: number;
  project?: { id: string; name: string; color: string | null } | null;
  assignee?: { id: string; name: string } | null;
};

export type ProspectActivity = {
  id: string;
  user_id: string;
  prospect_id: string;
  action_type: ActionType;
  title: string;
  description: string | null;
  created_at: string;
  occurred_at?: string | null;
  actor_name?: string | null;
  channel?: string | null;
};

export type DailyTask = {
  id: string;
  user_id: string;
  prospect_id: string | null;
  title: string;
  due_date: string;
  completed: boolean;
  task_kind: TaskKind;
  created_at: string;
  completed_at: string | null;
  description?: string | null;
  project_id?: string | null;
  assigned_to?: string | null;
  due_time?: string | null;
  priority?: string;
  status?: string;
  notes?: string | null;
  updated_at?: string | null;
  prospect?: Pick<Prospect, "id" | "club_name" | "status"> | null;
};

export type CrmSettings = {
  user_id: string;
  delay_relance_1_days: number;
  delay_relance_2_days: number;
  delay_relance_3_days: number;
  updated_at: string;
};

export type QuickAction = "mail_sent" | "call_made" | "demo_scheduled" | "client" | "refus";
