import { ProspectSearchClient } from "@/components/crm/ProspectSearchClient";
import { requireProjectModule } from "@/lib/projects/guard";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectSearchPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "prospects");
  return <ProspectSearchClient projectId={id} />;
}
