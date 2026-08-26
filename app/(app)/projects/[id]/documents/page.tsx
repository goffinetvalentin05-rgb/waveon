import { requireProjectModule } from "@/lib/projects/guard";
import { DocumentsClient } from "@/components/documents/DocumentsClient";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDocumentsPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "documents");
  return <DocumentsClient projectId={id} />;
}
