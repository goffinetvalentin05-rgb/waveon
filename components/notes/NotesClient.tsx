"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { EmptyState, ConfirmModal } from "@/components/ui/ConfirmModal";
import type { WorkspaceNote } from "@/lib/notes/types";
import type { Project } from "@/lib/projects/types";

export function NotesClient({ projectId, scope }: { projectId?: string; scope?: "personal" | "project" }) {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("id");
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<WorkspaceNote | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toDelete, setToDelete] = useState<WorkspaceNote | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (scope === "personal") params.set("scope", "personal");
    else if (projectId) params.set("project", projectId);
    const sp = params.toString() ? `?${params.toString()}` : "";
    const [n, p] = await Promise.all([
      fetch(`/api/notes${sp}`).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    const list = (n.notes ?? []) as WorkspaceNote[];
    setNotes(list);
    setProjects(p.projects ?? []);
    setActive((current) => {
      if (focusId) return list.find((x) => x.id === focusId) ?? list[0] ?? null;
      if (current) return list.find((x) => x.id === current.id) ?? list[0] ?? null;
      return list[0] ?? null;
    });
  }, [projectId, focusId, scope]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {projectId ? (
        <div className="flex justify-end">
          <button type="button" className={ui.btnPrimary} onClick={() => setShowNew(true)}>
            <IconPlus className="h-4 w-4" /> Note
          </button>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className={ui.h1}>Notes</h1>
            <p className="mt-1 text-sm text-[#8b869c]">Capturer vite, convertir en tâche si besoin.</p>
          </div>
          <button type="button" className={ui.btnPrimary} onClick={() => setShowNew(true)}>
            <IconPlus className="h-4 w-4" /> Nouvelle note
          </button>
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState title="Aucune note" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-1">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setActive(n)}
                  className={`w-full rounded-[12px] px-3 py-2.5 text-left ${
                    active?.id === n.id ? "bg-violet-500/12" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-[#f3f0fa]">{n.title || "Sans titre"}</p>
                  <p className="text-[11px] text-[#6a6578]">
                    {format(new Date(n.updated_at), "d MMM", { locale: fr })}
                    {n.project?.name ? ` · ${n.project.name}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {active ? (
            <NoteEditor
              key={active.id}
              note={active}
              projects={projects}
              scope={scope}
              onChange={(n) => {
                setActive(n);
                setNotes((prev) => prev.map((x) => (x.id === n.id ? n : x)));
              }}
              onDelete={() => setToDelete(active)}
            />
          ) : null}
        </div>
      )}

      {showNew ? (
        <NewNote
          projectId={projectId}
          scope={scope}
          projects={projects}
          onClose={() => setShowNew(false)}
          onCreated={(n) => {
            setShowNew(false);
            setNotes((prev) => [n, ...prev]);
            setActive(n);
          }}
        />
      ) : null}

      <ConfirmModal
        open={Boolean(toDelete)}
        title="Supprimer cette note ?"
        tone="danger"
        confirmLabel="Supprimer"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await fetch(`/api/notes/${toDelete.id}`, { method: "DELETE" });
          setNotes((prev) => prev.filter((n) => n.id !== toDelete.id));
          setActive(null);
          setToDelete(null);
        }}
      />
    </div>
  );
}

function NoteEditor({
  note,
  projects,
  scope,
  onChange,
  onDelete,
}: {
  note: WorkspaceNote;
  projects: Project[];
  scope?: "personal" | "project";
  onChange: (n: WorkspaceNote) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [project, setProject] = useState(note.project_id ?? "");

  const save = async (patch: Partial<WorkspaceNote>) => {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) onChange(data.note);
  };

  const convert = async () => {
    await fetch(`/api/notes/${note.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "convert" }),
    });
  };

  return (
    <div className={`${ui.card} p-5`}>
      <input
        className="w-full bg-transparent text-lg font-semibold text-[#f3f0fa] outline-none"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => void save({ title })}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {scope === "personal" ? null : (
        <select
          className={ui.input}
          value={project}
          onChange={(e) => {
            setProject(e.target.value);
            void save({ project_id: e.target.value || null, scope: "project" });
          }}
        >
          <option value="">Sans projet</option>
          {projects.filter((p) => p.status === "active").map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        )}
        <button type="button" className={ui.btnSecondary} onClick={convert}>
          Convertir en tâche
        </button>
        <button type="button" className={ui.btnGhost} onClick={onDelete}>
          Supprimer
        </button>
      </div>
      <textarea
        className={`${ui.input} mt-4 min-h-[280px] resize-y`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => void save({ content })}
      />
    </div>
  );
}

function NewNote({
  projectId,
  scope,
  projects,
  onClose,
  onCreated,
}: {
  projectId?: string;
  scope?: "personal" | "project";
  projects: Project[];
  onClose: () => void;
  onCreated: (n: WorkspaceNote) => void;
}) {
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        content: fd.get("content"),
        project_id: scope === "personal" ? null : fd.get("project_id") || projectId || null,
        scope: scope === "personal" ? "personal" : "project",
        tags: String(fd.get("tags") ?? ""),
      }),
    });
    const data = await res.json();
    if (res.ok) onCreated(data.note);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onClose} />
      <form onSubmit={submit} className={`${ui.modal} max-w-lg p-6`}>
        <h2 className="text-lg font-semibold">Nouvelle note</h2>
        <div className="mt-4 space-y-3">
          <input name="title" className={ui.input} placeholder="Titre" required />
          <textarea name="content" className={`${ui.input} min-h-[140px]`} placeholder="Contenu" />
          {scope === "personal" ? null : (
          <select name="project_id" className={ui.input} defaultValue={projectId ?? ""}>
            <option value="">Sans projet</option>
            {projects.filter((p) => p.status === "active").map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          )}
          <input name="tags" className={ui.input} placeholder="Tags, séparés par des virgules" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary}>
            Créer
          </button>
        </div>
      </form>
    </div>
  );
}
