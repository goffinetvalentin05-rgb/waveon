export type AppNotification = {
  id: string;
  kind: "follow_up" | "overdue_task" | "renewal" | "demo" | "upcoming_event";
  title: string;
  href: string;
  tone: "default" | "warning" | "danger";
  context: string;
};
