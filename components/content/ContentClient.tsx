"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { EmptyState, ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_STYLES,
  type ContentItem,
  type ContentStatus,
} from "@/lib/content/types";

export function ContentClient({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [toDelete, setToDelete] = useState<ContentItem | null>(null);
  const [filter, setFilter] = useState<ContentStatus | "all">("all");

  const load = useCallback(async () => {
    const res = await fetch(`/api/content?project=${encodeURIComponent(projectId)}`);
    const data = await res.json();
    if (res.ok) setItems(data.items ?? []);
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const visible = filter === "all" ? items : items.filter((i) => i.status === filter);

  const setStatus = async (item: ContentItem, status: ContentStatus) => {
    const res = await fetch(`/api/content/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) {
      setItems((prev) => prev.map((x) => (x.id === item.id ? data.item : x)));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-wo-border bg-white p-1">
          {(["all", ...CONTENT_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${
                filter === s ? "wo-subnav-active" : "text-wo-muted hover:bg-wo-hover hover:text-wo-text"
              }`}
            >
              {s === "all" ? "Tous" : s}
            </button>
          ))}
        </div>
        <button type="button" className={ui.btnPrimary} onClick={() => setShowNew(true)}>
          <IconPlus className="h-4 w-4" />
          Nouvelle idée
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Aucune idée de contenu"
          description="Capturez une publication, un post ou une vidéo pour ce projet uniquement."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => {
            const tone = CONTENT_STATUS_STYLES[item.status];
            return (
              <li key={item.id} className={`${ui.card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-wo-text">{item.title}</p>
                    <p className="mt-0.5 text-xs text-wo-muted">
                      {[item.platform, item.category].filter(Boolean).join(" · ") || "Sans catégorie"}
                      {" · "}
                      {format(new Date(item.updated_at), "d MMM", { locale: fr })}
                    </p>
                    {item.body ? <p className="mt-2 line-clamp-2 text-sm text-wo-secondary">{item.body}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className={`${ui.input} w-auto py-1.5 text-xs`}
                      value={item.status}
                      onChange={(e) => void setStatus(item, e.target.value as ContentStatus)}
                    >
                      {CONTENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.bg} ${tone.text}`}>
                      {item.status}
                    </span>
                    <button type="button" className={ui.iconBtn} onClick={() => setToDelete(item)} aria-label="Supprimer">
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showNew ? (
        <NewContent
          projectId={projectId}
          onClose={() => setShowNew(false)}
          onCreated={(item) => {
            setShowNew(false);
            setItems((prev) => [item, ...prev]);
          }}
        />
      ) : null}

      <ConfirmModal
        open={Boolean(toDelete)}
        title="Supprimer cette idée ?"
        description={toDelete?.title}
        tone="danger"
        confirmLabel="Supprimer"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await fetch(`/api/content/${toDelete.id}`, { method: "DELETE" });
          setItems((prev) => prev.filter((x) => x.id !== toDelete.id));
          setToDelete(null);
        }}
      />
    </div>
  );
}

function NewContent({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: (item: ContentItem) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        title: fd.get("title"),
        body: fd.get("body"),
        category: fd.get("category"),
        platform: fd.get("platform"),
        status: fd.get("status"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    onCreated(data.item);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onClose} />
      <form onSubmit={submit} className={`${ui.modal} max-w-lg p-6`}>
        <h2 className="text-lg font-semibold text-wo-text">Nouvelle idée</h2>
        <div className="mt-5 grid gap-3">
          <div>
            <label className={ui.label}>Titre *</label>
            <input name="title" required className={ui.input} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={ui.label}>Plateforme</label>
              <input name="platform" className={ui.input} placeholder="LinkedIn, Instagram…" />
            </div>
            <div>
              <label className={ui.label}>Catégorie</label>
              <input name="category" className={ui.input} placeholder="Produit, témoignage…" />
            </div>
          </div>
          <div>
            <label className={ui.label}>Statut</label>
            <select name="status" className={ui.input} defaultValue="idée">
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={ui.label}>Notes</label>
            <textarea name="body" className={`${ui.input} min-h-[88px] resize-y`} />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={loading}>
            {loading ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
