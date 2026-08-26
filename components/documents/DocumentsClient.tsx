"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconExternalLink, IconPlus, IconTrash } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { EmptyState, ConfirmModal } from "@/components/ui/ConfirmModal";
import type { ProjectDocument } from "@/lib/documents/types";

export function DocumentsClient({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [toDelete, setToDelete] = useState<ProjectDocument | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/documents?project=${encodeURIComponent(projectId)}`);
    const data = await res.json();
    if (res.ok) setDocs(data.documents ?? []);
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button type="button" className={ui.btnPrimary} onClick={() => setShowNew(true)}>
          <IconPlus className="h-4 w-4" />
          Ajouter un document
        </button>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          title="Aucun document"
          description="Liens, briefs et fichiers de référence, isolés à ce projet."
        />
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className={`${ui.card} flex items-start justify-between gap-3 p-4`}>
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-wo-text">{doc.title}</p>
                <p className="mt-0.5 text-xs text-wo-dim">
                  {format(new Date(doc.updated_at), "d MMMM yyyy", { locale: fr })}
                </p>
                {doc.notes ? <p className="mt-2 text-sm text-wo-secondary">{doc.notes}</p> : null}
                {doc.url ? (
                  <a
                    href={doc.url.startsWith("http") ? doc.url : `https://${doc.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-wo-accent hover:underline"
                  >
                    Ouvrir <IconExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
              <button type="button" className={ui.iconBtn} onClick={() => setToDelete(doc)} aria-label="Supprimer">
                <IconTrash className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showNew ? (
        <NewDocument
          projectId={projectId}
          onClose={() => setShowNew(false)}
          onCreated={(doc) => {
            setShowNew(false);
            setDocs((prev) => [doc, ...prev]);
          }}
        />
      ) : null}

      <ConfirmModal
        open={Boolean(toDelete)}
        title="Supprimer ce document ?"
        description={toDelete?.title}
        tone="danger"
        confirmLabel="Supprimer"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await fetch(`/api/documents/${toDelete.id}`, { method: "DELETE" });
          setDocs((prev) => prev.filter((x) => x.id !== toDelete.id));
          setToDelete(null);
        }}
      />
    </div>
  );
}

function NewDocument({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: (doc: ProjectDocument) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        title: fd.get("title"),
        url: fd.get("url"),
        notes: fd.get("notes"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    onCreated(data.document);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onClose} />
      <form onSubmit={submit} className={`${ui.modal} max-w-lg p-6`}>
        <h2 className="text-lg font-semibold text-wo-text">Nouveau document</h2>
        <div className="mt-5 grid gap-3">
          <div>
            <label className={ui.label}>Titre *</label>
            <input name="title" required className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Lien</label>
            <input name="url" className={ui.input} placeholder="https://…" />
          </div>
          <div>
            <label className={ui.label}>Notes</label>
            <textarea name="notes" className={`${ui.input} min-h-[80px] resize-y`} />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={loading}>
            {loading ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  );
}
