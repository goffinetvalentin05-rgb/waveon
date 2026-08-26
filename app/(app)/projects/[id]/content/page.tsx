import { requireProjectModule } from "@/lib/projects/guard";
import { ModulePlaceholder } from "@/components/projects/ModulePlaceholder";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectContentPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "content");
  return (
    <ModulePlaceholder
      title="Idées de contenu"
      description="Un espace collaboratif pour les publications, avec des catégories configurables par projet. Les statuts iront d'idée à publié."
    />
  );
}
