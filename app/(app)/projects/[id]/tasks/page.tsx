import { TasksClient } from "@/components/tasks/TasksClient";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectTasksPage({ params }: Props) {
  const { id } = await params;
  return <TasksClient projectId={id} />;
}
