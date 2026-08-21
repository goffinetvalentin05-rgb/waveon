export type WorkspaceNote = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  project_id: string | null;
  scope?: "personal" | "project";
  tags: string[];
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string; color: string | null } | null;
};
