import { FinancesClient } from "@/components/finance/FinancesClient";
import { requireProjectModule } from "@/lib/projects/guard";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectFinancesPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "finances");
  return <FinancesClient projectId={id} />;
}
