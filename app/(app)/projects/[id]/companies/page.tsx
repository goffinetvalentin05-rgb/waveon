import { requireProjectModule } from "@/lib/projects/guard";
import { ModulePlaceholder } from "@/components/projects/ModulePlaceholder";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectCompaniesPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "companies");
  return (
    <ModulePlaceholder
      title="Entreprises"
      description="Chaque projet aura son propre carnet d'entreprises, isolé des autres. Ce module sera branché ici sans mélanger IKONERA, Build ou Obillz."
    />
  );
}
