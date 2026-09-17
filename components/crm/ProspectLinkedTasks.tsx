"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconChecklist, IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import type { WorkspaceTask } from "@/lib/tasks/types";

export function ProspectLinkedTasks({
  prospectId,
  projectId,
  openCreateKey = 0,
}: {
  prospectId: string;
  projectId?: string | null;
  openCreateKey?: number;
}) {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [seenCreateKey, setSeenCreateKey] = useState(openCreateKey);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  if (openCreateKey !== seenCreateKey) {
    setSeenCreateKey(openCreateKey);
    if (openCreateKey > 0) setCreating(true);
  }

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ view: "all", prospect: prospectId });
    if (projectId) sp.set("project", projectId);
    const res = await fetch(`/api/tasks?${sp}`);
    const data = await res.json();
    if (res.ok) setTasks(data.tasks ?? []);
    setLoading(false);
  }, [prospectId, projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const href = projectId ? `/projects/${projectId}/tasks` : "/personal/tasks";

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        prospect_id: prospectId,
        project_id: projectId || null,
        scope: projectId ? "project" : "personal",
      }),
    });
    setSaving(false);
    if (!res.ok) return;
    setTitle("");
    setCreating(false);
    await load();
  };

  return (
    <section className={`${ui.card} p-4 lg:p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={ui.h2}>Tâches liées</h2>
        <Link href={href} className="text-[12.5px] font-medium text-wo-muted transition hover:text-wo-text">
          To-do list
        </Link>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-wo-dim">Chargement…</p>
      ) : tasks.length === 0 && !creating ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
          <p className="text-sm text-wo-muted">Aucune tâche rattachée.</p>
          <button type="button" className={`${ui.btnSecondary} mt-4`} onClick={() => setCreating(true)}>
            <IconPlus className="h-4 w-4" />
            Créer une tâche
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {tasks.map((t) => {
            const done = t.completed || t.status === "Terminé";
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.025] px-3.5 py-3"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    done ? "bg-white/[0.04] text-wo-dim" : "bg-wo-accent-soft text-[#f3a35c]"
                  }`}
                >
                  <IconChecklist className="h-4 w-4" stroke={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[13.5px] ${done ? "text-wo-dim line-through" : "font-medium text-wo-text"}`}>
                    {t.title}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-wo-dim">
                    {t.status}
                    {t.due_date ? ` · ${format(new Date(`${t.due_date}T12:00:00`), "d MMM", { locale: fr })}` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <form onSubmit={(e) => void createTask(e)} className="mt-4 space-y-3">
          <input
            className={ui.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la tâche"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button type="button" className={ui.btnGhost} onClick={() => setCreating(false)}>
              Annuler
            </button>
            <button type="submit" className={ui.btnPrimary} disabled={saving || !title.trim()}>
              {saving ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      ) : tasks.length > 0 ? (
        <button type="button" className={`${ui.btnGhost} mt-3 px-0`} onClick={() => setCreating(true)}>
          <IconPlus className="h-4 w-4" />
          Créer une tâche
        </button>
      ) : null}
    </section>
  );
}
