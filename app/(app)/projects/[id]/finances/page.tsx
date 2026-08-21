import { FinancesClient } from "@/components/finance/FinancesClient";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectFinancesPage({ params }: Props) {
  const { id } = await params;
  return <FinancesClient projectId={id} />;
}
