"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconArrowUpRight, IconBuilding, IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { EmptyState } from "@/components/ui/ConfirmModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ScrollableModal } from "@/components/ui/ScrollableModal";
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

export function TasksClient({ projectId, scope }: { projectId?: string; scope?: "personal" | "project" }) {
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
    if (scope === "personal") sp.set("scope", "personal");
    else if (projectId) sp.set("project", projectId);
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
  }, [view, projectId, scope]);

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
          <p className="text-sm text-wo-muted">{tasks.length} tâche{tasks.length > 1 ? "s" : ""}</p>
        ) : (
          <div>
            <h1 className={ui.h1}>Tâches</h1>
            <p className="mt-1 text-sm text-wo-muted">Ce qui compte, clairement.</p>
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
            className={`inline-flex shrink-0 items-center rounded-full px-3.5 py-2 text-sm font-medium transition ${
              view === v.id ? ui.subNavActive : ui.subNavIdle
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-wo-dim">Chargement…</p>
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
          scope={scope}
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

function taskProspectHref(task: WorkspaceTask): string | null {
  const prospectId = task.prospect_id ?? task.prospect?.id;
  if (!prospectId) return null;
  const projectId = task.project_id ?? task.project?.id;
  if (projectId) return `/projects/${projectId}/prospects/${prospectId}`;
  return `/crm/prospects/${prospectId}`;
}

function ProspectChip({
  task,
  className = "",
}: {
  task: WorkspaceTask;
  className?: string;
}) {
  const href = taskProspectHref(task);
  const name = task.prospect?.club_name;
  if (!href || !name) return null;
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={`mt-0.5 inline-flex max-w-full items-center gap-1 text-[12px] font-medium text-wo-accent transition hover:text-[#f3a35c] ${className}`}
    >
      <IconBuilding className="h-3.5 w-3.5 shrink-0" stroke={1.7} />
      <span className="truncate">{name}</span>
      <IconArrowUpRight className="h-3 w-3 shrink-0 opacity-80" stroke={1.8} />
    </Link>
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
    <li className="wo-list-row flex items-center gap-3 px-2.5 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${
          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-wo-border hover:border-wo-accent"
        }`}
        aria-label="Terminer"
      >
        {done ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="w-full text-left">
          <p className={`truncate text-sm font-medium text-wo-text ${done ? "line-through opacity-50" : ""}`}>
            {task.title}
          </p>
        </button>
        <ProspectChip task={task} />
        <button type="button" onClick={onOpen} className="mt-0.5 w-full text-left">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-wo-dim">
            <span>{formatDay(task.due_date)}</span>
            {task.due_time ? <span>{String(task.due_time).slice(0, 5)}</span> : null}
            {task.project?.name ? <span>{task.project.name}</span> : null}
            {task.assignee?.name ? <span>{task.assignee.name}</span> : null}
          </p>
        </button>
      </div>
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
            className="flex w-[268px] shrink-0 flex-col rounded-[20px] border border-white/[0.06] bg-[linear-gradient(158deg,rgba(255,255,255,0.05),rgba(255,255,255,0.012))]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) onStatus(id, status);
            }}
          >
            <div className="flex items-center justify-between px-3.5 py-3">
              <h3 className="text-[13px] font-medium text-wo-text">{status}</h3>
              <span className="text-[11px] text-wo-muted">{items.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  onClick={() => onOpen(t)}
                  className="cursor-pointer rounded-lg border border-wo-border bg-[color:var(--wo-elevated)] px-3 py-2.5 text-left transition hover:border-wo-accent/30"
                >
                  <p className="text-[13px] font-medium text-wo-text">{t.title}</p>
                  <ProspectChip task={t} className="mt-1" />
                  <p className="mt-1 text-[11px] text-wo-dim">{formatDay(t.due_date)}</p>
                </div>
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
  scope,
  projects,
  people,
  onClose,
  onSaved,
}: {
  task: WorkspaceTask | null;
  projectId?: string;
  scope?: "personal" | "project";
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
  const [prospectIdValue, setProspectIdValue] = useState(task?.prospect_id ?? task?.prospect?.id ?? "");
  const [prospectOptions, setProspectOptions] = useState<{ id: string; club_name: string }[]>(
    task?.prospect ? [{ id: task.prospect.id, club_name: task.prospect.club_name }] : []
  );
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [subtasks, setSubtasks] = useState<{ title: string; completed: boolean }[]>(
    (task?.subtasks ?? []).map((s) => ({ title: s.title, completed: s.completed }))
  );
  const [subInput, setSubInput] = useState("");

  useEffect(() => {
    const pid = project || projectId;
    if (!pid || scope === "personal") return;
    const sp = new URLSearchParams({ project: pid, pageSize: "200", sort: "club_name", order: "asc" });
    void fetch(`/api/prospects?${sp}`)
      .then((r) => r.json())
      .then((data) => {
        const list = ((data.prospects ?? []) as { id: string; club_name: string }[]).map((p) => ({
          id: p.id,
          club_name: p.club_name,
        }));
        if (task?.prospect && !list.some((p) => p.id === task.prospect?.id)) {
          list.unshift({ id: task.prospect.id, club_name: task.prospect.club_name });
        }
        setProspectOptions(list);
      })
      .catch(() => null);
  }, [project, projectId, scope, task?.prospect]);

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
      project_id: scope === "personal" ? null : project || null,
      scope: scope === "personal" ? "personal" : "project",
      assigned_to: assignee || null,
      prospect_id: prospectIdValue || null,
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

  const selectedProspect = prospectOptions.find((p) => p.id === prospectIdValue) ?? task?.prospect ?? null;
  const selectedHref = selectedProspect
    ? taskProspectHref({
        ...(task ?? ({} as WorkspaceTask)),
        prospect_id: selectedProspect.id,
        prospect: { id: selectedProspect.id, club_name: selectedProspect.club_name, status: task?.prospect?.status ?? "" },
        project_id: project || projectId || task?.project_id || null,
      })
    : null;

  return (
    <ScrollableModal
      open
      variant="dialog"
      maxWidthClass="max-w-[40rem]"
      onClose={saving ? () => undefined : onClose}
      title={task ? "Modifier la tâche" : "Nouvelle tâche"}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {task ? (
            <button type="button" className={`${ui.btnGhost} justify-center sm:justify-start`} onClick={duplicate}>
              Dupliquer
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={`${ui.btnSecondary} min-h-11 sm:min-h-0`} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="button" className={`${ui.btnPrimary} min-h-11 sm:min-h-0`} disabled={saving} onClick={() => void save()}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={ui.label}>Titre</label>
          <input className={`${ui.input} mt-1 min-h-11`} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={ui.label}>Description</label>
          <textarea
            className={`${ui.input} mt-1 min-h-[88px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={ui.label}>Échéance</label>
            <input type="date" className={`${ui.input} mt-1 min-h-11`} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className={ui.label}>Heure</label>
            <input type="time" className={`${ui.input} mt-1 min-h-11`} value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </div>
          <div>
            <label className={ui.label}>Priorité</label>
            <select className={`${ui.input} mt-1 min-h-11`} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={ui.label}>Statut</label>
            <select className={`${ui.input} mt-1 min-h-11`} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {scope === "personal" ? null : (
            <div>
              <label className={ui.label}>Projet</label>
              <select className={`${ui.input} mt-1 min-h-11`} value={project} onChange={(e) => setProject(e.target.value)}>
                <option value="">Aucun</option>
                {projects
                  .filter((p) => p.status === "active")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div>
            <label className={ui.label}>Assigné à</label>
            <select className={`${ui.input} mt-1 min-h-11`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
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
          <label className={ui.label}>Prospect lié</label>
          {scope === "personal" && !selectedProspect ? (
            <p className="mt-2 text-[13px] text-wo-dim">Aucun prospect lié</p>
          ) : (
            <select
              className={`${ui.input} mt-1 min-h-11`}
              value={prospectIdValue}
              onChange={(e) => setProspectIdValue(e.target.value)}
            >
              <option value="">Aucun prospect lié</option>
              {prospectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.club_name}
                </option>
              ))}
            </select>
          )}
          {selectedHref && selectedProspect ? (
            <Link
              href={selectedHref}
              className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-wo-accent transition hover:text-[#f3a35c]"
            >
              <IconBuilding className="h-3.5 w-3.5" stroke={1.7} />
              Ouvrir {selectedProspect.club_name}
              <IconArrowUpRight className="h-3.5 w-3.5" stroke={1.8} />
            </Link>
          ) : null}
        </div>

        <div>
          <label className={ui.label}>Sous-tâches</label>
          <ul className="mt-2 space-y-1">
            {subtasks.map((s, i) => (
              <li key={i} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={s.completed}
                  onChange={(e) =>
                    setSubtasks((prev) => prev.map((x, j) => (j === i ? { ...x, completed: e.target.checked } : x)))
                  }
                />
                <span className={s.completed ? "text-wo-dim line-through" : "text-wo-text"}>{s.title}</span>
                <button
                  type="button"
                  className="ml-auto text-wo-dim"
                  onClick={() => setSubtasks((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <input
            className={`${ui.input} mt-2 min-h-11`}
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
        <div>
          <label className={ui.label}>Notes</label>
          <textarea className={`${ui.input} mt-1 min-h-[72px] resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </ScrollableModal>
  );
}
