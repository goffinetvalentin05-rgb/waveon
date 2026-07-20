export const PROSPECT_STATUSES = [
  "À contacter",
  "Contacté",
  "Relance 1",
  "Relance 2",
  "Démonstration",
  "Client",
  "Refus",
  "Pas intéressé",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

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
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

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
  status: ProspectStatus;
  last_action: string | null;
  last_action_at: string | null;
  next_follow_up: string | null;
  notes: string | null;
  demo_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectActivity = {
  id: string;
  user_id: string;
  prospect_id: string;
  action_type: ActionType;
  title: string;
  description: string | null;
  created_at: string;
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
