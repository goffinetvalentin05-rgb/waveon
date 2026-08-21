import { CalendarClient } from "@/components/calendar/CalendarClient";
import { requireProjectModule } from "@/lib/projects/guard";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectCalendarPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "calendar");
  return <CalendarClient scope="project" projectId={id} showBirthdays={false} hideTitle />;
}
