import { ProspectStats } from "@/components/crm/ProspectStats";
import { requireProjectModule } from "@/lib/projects/guard";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectStatsPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "stats");
  return <ProspectStats projectId={id} />;
}
