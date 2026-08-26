export type ProjectDocument = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
