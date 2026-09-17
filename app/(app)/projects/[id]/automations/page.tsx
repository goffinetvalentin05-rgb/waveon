import { ComingSoon } from "@/components/app/ComingSoon";
import { requireProjectModule } from "@/lib/projects/guard";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectAutomationsPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "prospects");
  return (
    <ComingSoon
      title="Automatisations"
      description="Les séquences de relance et les règles automatiques arriveront ici. En attendant, programmez vos relances depuis chaque prospect."
    />
  );
}
