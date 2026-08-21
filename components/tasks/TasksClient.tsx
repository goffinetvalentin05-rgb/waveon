"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { EmptyState } from "@/components/ui/ConfirmModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  PRIORITY_STYLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
  type WorkspaceTask,
} from "@/lib/tasks/types";
import type { Project } from "@/lib/projects/types";
import type { Person } from "@/lib/people/types";

type View = "today" | "week" | "upcoming" | "all" | "overdue" | "done" | "kanban";

const VIEWS: { id: View; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "upcoming", label: "À venir" },
  { id: "overdue", label: "En retard" },
  { id: "all", label: "Toutes" },
  { id: "done", label: "Terminées" },
  { id: "kanban", label: "Kanban" },
];

export function TasksClient({ projectId }: { projectId?: string }) {
  const [view, setView] = useState<View>("today");
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WorkspaceTask | null | "new">(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [toDelete, setToDelete] = useState<WorkspaceTask | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams({ view });
    if (projectId) sp.set("project", projectId);
    try {
      const [t, p, pe] = await Promise.all([
        fetch(`/api/tasks?${sp}`).then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/people").then((r) => r.json()),
      ]);
      setTasks(t.tasks ?? []);
      setProjects(p.projects ?? []);
      setPeople(pe.people ?? []);
    } finally {
      setLoading(false);
    }
  }, [view, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status, completed: status === "Terminé" } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {projectId ? (
          <p className="text-sm text-[#8b869c]">{tasks.length} tâche{tasks.length > 1 ? "s" : ""}</p>
        ) : (
          <div>
            <h1 className={ui.h1}>Tâches</h1>
            <p className="mt-1 text-sm text-[#8b869c]">Ce qui compte, clairement.</p>
          </div>
        )}
        <button type="button" className={ui.btnPrimary} onClick={() => setEditing("new")}>
          <IconPlus className="h-4 w-4" />
          Nouvelle tâche
        </button>
      </div>

      <div className={`${ui.subNav} mb-0`}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`inline-flex shrink-0 items-center rounded-[10px] px-3.5 py-2 text-sm font-medium transition ${
              view === v.id ? ui.subNavActive : ui.subNavIdle
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#6a6578]">Chargement…</p>
      ) : view === "kanban" ? (
        <Kanban tasks={tasks} onStatus={updateStatus} onOpen={setEditing} />
      ) : tasks.length === 0 ? (
        <EmptyState title="Rien ici" description="Crée une tâche ou change de vue." />
      ) : (
        <ul className="space-y-1">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onOpen={() => setEditing(task)}
              onToggle={() => updateStatus(task.id, task.status === "Terminé" ? "À faire" : "Terminé")}
              onDelete={() => setToDelete(task)}
            />
          ))}
        </ul>
      )}

      {editing ? (
        <TaskEditor
          task={editing === "new" ? null : editing}
          projectId={projectId}
          projects={projects}
          people={people}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}

      <ConfirmModal
        open={Boolean(toDelete)}
        title="Supprimer cette tâche ?"
        description="Cette action est définitive."
        tone="danger"
        confirmLabel="Supprimer"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await fetch(`/api/tasks/${toDelete.id}`, { method: "DELETE" });
          setToDelete(null);
          void load();
        }}
      />
    </div>
  );
}

function TaskRow({
  task,
  onOpen,
  onToggle,
  onDelete,
}: {
  task: WorkspaceTask;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const prio = PRIORITY_STYLES[(task.priority as TaskPriority) ?? "Normale"];
  const done = task.status === "Terminé" || task.completed;
  return (
    <li className="flex items-center gap-3 rounded-[12px] px-2 py-2.5 hover:bg-white/[0.03]">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${
          done ? "border-violet-500 bg-violet-500 text-white" : "border-white/20 hover:border-violet-400"
        }`}
        aria-label="Terminer"
      >
        {done ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className={`truncate text-sm font-medium text-[#f3f0fa] ${done ? "line-through opacity-50" : ""}`}>
          {task.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[#6a6578]">
          <span>{formatDay(task.due_date)}</span>
          {task.due_time ? <span>{String(task.due_time).slice(0, 5)}</span> : null}
          {task.project?.name ? <span>{task.project.name}</span> : null}
          {task.assignee?.name ? <span>{task.assignee.name}</span> : null}
        </p>
      </button>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${prio.bg} ${prio.text}`}>
        {task.priority ?? "Normale"}
      </span>
      <button type="button" className={ui.btnGhost} onClick={onDelete}>
        ×
      </button>
    </li>
  );
}

function Kanban({
  tasks,
  onStatus,
  onOpen,
}: {
  tasks: WorkspaceTask[];
  onStatus: (id: string, status: TaskStatus) => void;
  onOpen: (task: WorkspaceTask) => void;
}) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {TASK_STATUSES.map((status) => {
        const items = tasks.filter((t) => (t.status ?? "À faire") === status);
        return (
          <div
            key={status}
            className="flex w-[260px] shrink-0 flex-col rounded-[14px] border border-white/[0.06] bg-[#100e16]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) onStatus(id, status);
            }}
          >
            <div className="flex items-center justify-between px-3.5 py-3">
              <h3 className="text-[13px] font-medium text-[#f3f0fa]">{status}</h3>
              <span className="text-[11px] text-[#8b869c]">{items.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2">
              {items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  onClick={() => onOpen(t)}
                  className="rounded-[12px] border border-white/[0.04] bg-[#14121c] px-3 py-2.5 text-left hover:border-white/[0.1]"
                >
                  <p className="text-[13px] font-medium text-[#f3f0fa]">{t.title}</p>
                  <p className="mt-1 text-[11px] text-[#6a6578]">{formatDay(t.due_date)}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDay(value: string) {
  try {
    return format(new Date(`${value.slice(0, 10)}T12:00:00`), "EEE d MMM", { locale: fr });
  } catch {
    return value;
  }
}

function TaskEditor({
  task,
  projectId,
  projects,
  people,
  onClose,
  onSaved,
}: {
  task: WorkspaceTask | null;
  projectId?: string;
  projects: Project[];
  people: Person[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState(task?.due_time ? String(task.due_time).slice(0, 5) : "");
  const [priority, setPriority] = useState<TaskPriority>((task?.priority as TaskPriority) ?? "Normale");
  const [status, setStatus] = useState<TaskStatus>((task?.status as TaskStatus) ?? "À faire");
  const [project, setProject] = useState(task?.project_id ?? projectId ?? "");
  const [assignee, setAssignee] = useState(task?.assigned_to ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [subtasks, setSubtasks] = useState<{ title: string; completed: boolean }[]>(
    (task?.subtasks ?? []).map((s) => ({ title: s.title, completed: s.completed }))
  );
  const [subInput, setSubInput] = useState("");

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const payload = {
      title,
      description,
      due_date: dueDate,
      due_time: dueTime || null,
      priority,
      status,
      project_id: project || null,
      assigned_to: assignee || null,
      notes,
      subtasks,
    };
    const res = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", {
      method: task ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) onSaved();
  };

  const duplicate = async () => {
    if (!task) return;
    await fetch(`/api/tasks/${task.id}/duplicate`, { method: "POST" });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className={ui.overlay} onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/[0.08] bg-[#16141f] p-6">
        <h2 className="text-lg font-semibold text-[#f3f0fa]">{task ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
        <div className="mt-5 space-y-3">
          <div>
            <label className={ui.label}>Titre</label>
            <input className={ui.input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={ui.label}>Description</label>
            <textarea
              className={`${ui.input} min-h-[88px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ui.label}>Échéance</label>
              <input type="date" className={ui.input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className={ui.label}>Heure</label>
              <input type="time" className={ui.input} value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
            <div>
              <label className={ui.label}>Priorité</label>
              <select className={ui.input} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={ui.label}>Statut</label>
              <select className={ui.input} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {TASK_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={ui.label}>Projet</label>
              <select className={ui.input} value={project} onChange={(e) => setProject(e.target.value)}>
                <option value="">Aucun</option>
                {projects.filter((p) => p.status === "active").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ui.label}>Assigné à</label>
              <select className={ui.input} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Personne</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={ui.label}>Sous-tâches</label>
            <ul className="mt-2 space-y-1">
              {subtasks.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={s.completed}
                    onChange={(e) =>
                      setSubtasks((prev) => prev.map((x, j) => (j === i ? { ...x, completed: e.target.checked } : x)))
                    }
                  />
                  <span className={s.completed ? "text-[#6a6578] line-through" : "text-[#e8e4f0]"}>{s.title}</span>
                  <button
                    type="button"
                    className="ml-auto text-[#6a6578]"
                    onClick={() => setSubtasks((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                className={ui.input}
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                placeholder="Ajouter une sous-tâche"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (subInput.trim()) {
                      setSubtasks((prev) => [...prev, { title: subInput.trim(), completed: false }]);
                      setSubInput("");
                    }
                  }
                }}
              />
            </div>
          </div>
          <div>
            <label className={ui.label}>Notes</label>
            <textarea className={`${ui.input} min-h-[72px] resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {task ? (
            <button type="button" className={ui.btnGhost} onClick={duplicate}>
              Dupliquer
            </button>
          ) : null}
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={ui.btnPrimary} disabled={saving} onClick={save}>
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
