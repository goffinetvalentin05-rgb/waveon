"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ui } from "@/lib/design/tokens";
import type { WorkspaceTask } from "@/lib/tasks/types";

export function ProspectLinkedTasks({
  prospectId,
  projectId,
}: {
  prospectId: string;
  projectId?: string | null;
}) {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <section className={`${ui.card} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={ui.h2}>Tâches liées</h2>
        <Link href={href} className="text-sm font-medium text-wo-accent">
          Ouvrir les tâches
        </Link>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-wo-dim">Chargement…</p>
      ) : tasks.length === 0 ? (
        <p className="mt-4 text-sm text-wo-muted">Aucune tâche rattachée à ce prospect.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
              <span className={`truncate ${t.completed || t.status === "Terminé" ? "text-wo-dim line-through" : "text-wo-text"}`}>
                {t.title}
              </span>
              <span className="shrink-0 text-xs text-wo-dim">
                {t.due_date ? format(new Date(`${t.due_date}T12:00:00`), "d MMM", { locale: fr }) : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
