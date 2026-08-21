import { TasksClient } from "@/components/tasks/TasksClient";
import { requireProjectModule } from "@/lib/projects/guard";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectTasksPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "tasks");
  return <TasksClient projectId={id} scope="project" />;
}
