import { NotesClient } from "@/components/notes/NotesClient";
import { Suspense } from "react";

export default function NotesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-wo-dim">Chargement…</p>}>
      <NotesClient />
    </Suspense>
  );
}
