import { requireProjectModule } from "@/lib/projects/guard";
import { ui } from "@/lib/design/tokens";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDocumentsPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "documents");
  return (
    <div className={`${ui.card} p-6`}>
      <h2 className={ui.h2}>Documents</h2>
      <p className="mt-2 text-sm text-[#8a9e96]">
        Ce module est activé. L&apos;espace documents sera branché ici sans impacter vos données actuelles.
      </p>
    </div>
  );
}
