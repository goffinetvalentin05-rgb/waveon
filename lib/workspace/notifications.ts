export type AppNotification = {
  id: string;
  kind: "follow_up" | "overdue_task" | "renewal" | "demo";
  title: string;
  href: string;
  tone: "default" | "warning" | "danger";
};
