import { NotesClient } from "@/components/notes/NotesClient";
import { requireProjectModule } from "@/lib/projects/guard";
import { Suspense } from "react";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectNotesPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "notes");
  return (
    <Suspense fallback={<p className="text-sm text-[#6b7d76]">Chargement…</p>}>
      <NotesClient projectId={id} scope="project" />
    </Suspense>
  );
}
