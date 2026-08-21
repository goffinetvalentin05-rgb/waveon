import { ProspectStats } from "@/components/crm/ProspectStats";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectStatsPage({ params }: Props) {
  const { id } = await params;
  return <ProspectStats projectId={id} />;
}
