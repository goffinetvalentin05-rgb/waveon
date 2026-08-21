import { NotesClient } from "@/components/notes/NotesClient";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectNotesPage({ params }: Props) {
  const { id } = await params;
  return <NotesClient projectId={id} />;
}
