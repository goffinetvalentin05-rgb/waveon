export const CONTENT_STATUSES = ["idée", "en cours", "planifié", "publié"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type ContentItem = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  body: string | null;
  category: string | null;
  platform: string | null;
  status: ContentStatus;
  scheduled_at: string | null;
  published_at: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export const CONTENT_STATUS_STYLES: Record<ContentStatus, { bg: string; text: string }> = {
  idée: { bg: "bg-slate-100", text: "text-slate-700" },
  "en cours": { bg: "bg-indigo-50", text: "text-indigo-700" },
  planifié: { bg: "bg-amber-50", text: "text-amber-800" },
  publié: { bg: "bg-emerald-50", text: "text-emerald-800" },
};
