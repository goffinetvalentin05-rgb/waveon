export type ProjectMessage = {
  id: string;
  project_id: string;
  author_id: string;
  body: string;
  client_id: string | null;
  created_at: string;
  author_name: string;
};

export type DiscussionUnread = {
  project_id: string;
  unread: number;
};
