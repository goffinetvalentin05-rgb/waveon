export const TASK_PRIORITIES = ["Faible", "Normale", "Haute", "Urgente"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["À faire", "En cours", "Bloqué", "Terminé"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskSubtask = {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
};

export type WorkspaceTask = {
  id: string;
  user_id: string;
  prospect_id: string | null;
  title: string;
  description: string | null;
  project_id: string | null;
  scope?: "personal" | "project";
  assigned_to: string | null;
  due_date: string;
  due_time: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  notes: string | null;
  completed: boolean;
  task_kind: string;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  prospect?: { id: string; club_name: string; status: string } | null;
  project?: { id: string; name: string; color: string | null } | null;
  assignee?: { id: string; name: string } | null;
  subtasks?: TaskSubtask[];
};

export const PRIORITY_STYLES: Record<TaskPriority, { text: string; bg: string; dot: string }> = {
  Faible: { text: "text-[#8a9e96]", bg: "bg-white/[0.06]", dot: "bg-[#6b7d76]" },
  Normale: { text: "text-teal-200", bg: "bg-teal-500/15", dot: "bg-teal-400" },
  Haute: { text: "text-amber-200", bg: "bg-amber-500/15", dot: "bg-amber-400" },
  Urgente: { text: "text-rose-200", bg: "bg-rose-500/15", dot: "bg-rose-400" },
};
