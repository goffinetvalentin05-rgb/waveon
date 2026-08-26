import { requireProjectModule } from "@/lib/projects/guard";
import { ContentClient } from "@/components/content/ContentClient";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectContentPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "content");
  return <ContentClient projectId={id} />;
}
