export const CALENDAR_CATEGORIES = [
  "appointment",
  "demo",
  "room",
  "personal_task",
  "birthday",
  "other",
] as const;

export type CalendarCategory = (typeof CALENDAR_CATEGORIES)[number];

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  category: CalendarCategory;
  start_at: string;
  end_at: string;
  all_day: boolean;
  description: string | null;
  color: string;
  location: string | null;
  source: string | null;
  source_id: string | null;
  project_id: string | null;
  scope?: "personal" | "project";
  created_at: string;
  updated_at: string;
};

export type CalendarEventInput = {
  title: string;
  category: CalendarCategory;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  description?: string | null;
  color?: string;
  location?: string | null;
  source?: string | null;
  source_id?: string | null;
  project_id?: string | null;
  scope?: "personal" | "project";
};

export type Birthday = {
  id: string;
  user_id: string;
  person_name: string;
  birth_date: string;
  note: string | null;
  remind_day_before: boolean;
  remind_same_day: boolean;
  created_at: string;
  updated_at: string;
};

export type BirthdayInput = {
  person_name: string;
  birth_date: string;
  note?: string | null;
  remind_day_before?: boolean;
  remind_same_day?: boolean;
};

/** Occurrence virtuelle d'anniversaire pour affichage calendrier. */
export type BirthdayOccurrence = {
  birthdayId: string;
  person_name: string;
  date: string;
  note: string | null;
  age: number | null;
};

export const CALENDAR_CATEGORY_LABELS: Record<CalendarCategory, string> = {
  appointment: "Rendez-vous",
  demo: "Démonstration",
  room: "Salle",
  personal_task: "Tâche personnelle",
  birthday: "Anniversaire",
  other: "Autre",
};

export const CALENDAR_CATEGORY_COLORS: Record<CalendarCategory, string> = {
  appointment: "#8b5cf6",
  demo: "#a78bfa",
  room: "#67e8f9",
  personal_task: "#34d399",
  birthday: "#fb7185",
  other: "#94a3b8",
};
