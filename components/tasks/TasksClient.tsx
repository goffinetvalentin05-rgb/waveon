"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { TodayTaskList } from "@/components/crm/TodayTaskList";
import type { DailyTask, TaskKind } from "@/lib/crm/types";

type Tab = "today" | "upcoming" | "done";

const KIND_OPTIONS: { value: TaskKind; label: string }[] = [
  { value: "custom", label: "Personnel" },
  { value: "follow_up", label: "Relance" },
  { value: "first_contact", label: "Contact" },
  { value: "demo", label: "Démo" },
];

function fmtDay(value: string) {
  try {
    return format(new Date(`${value.slice(0, 10)}T12:00:00`), "EEEE d MMMM", { locale: fr });
  } catch {
    return value;
  }
}

export function TasksClient() {
  const [tab, setTab] = useState<Tab>("today");
  const [today, setToday] = useState<DailyTask[]>([]);
  const [upcoming, setUpcoming] = useState<DailyTask[]>([]);
  const [completed, setCompleted] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks?range=board");
      const data = await res.json();
      if (res.ok) {
        setToday(data.today ?? []);
        setUpcoming(data.upcoming ?? []);
        setCompleted(data.completed ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "today", label: "Aujourd'hui", count: today.length },
    { id: "upcoming", label: "À venir", count: upcoming.length },
    { id: "done", label: "Terminées", count: completed.length },
  ];

  const list = tab === "today" ? today : tab === "upcoming" ? upcoming : completed;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between crm-animate-in">
        <div>
          <h1 className={ui.h1}>Tâches</h1>
          <p className="mt-1 text-sm text-[#8b869c]">Ce qui compte aujourd&apos;hui, et ce qui suit.</p>
        </div>
        <button type="button" className={ui.btnPrimary} onClick={() => setShowCreate(true)}>
          <IconPlus className="h-4 w-4" stroke={2} />
          Nouvelle tâche
        </button>
      </div>

      <div className={`${ui.subNav} mb-0 crm-animate-in-delay-1`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-[10px] px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id ? ui.subNavActive : ui.subNavIdle
            }`}
          >
            {t.label}
            <span className="tabular-nums text-[11px] opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="crm-animate-in-delay-2">
        {loading ? (
          <p className="text-sm text-[#6a6578]">Chargement…</p>
        ) : tab === "upcoming" && upcoming.length > 0 ? (
          <UpcomingGroups tasks={upcoming} />
        ) : (
          <TodayTaskList
            tasks={list}
            emptyLabel={
              tab === "today"
                ? "Aucune tâche pour aujourd'hui."
                : tab === "upcoming"
                  ? "Rien de planifié plus tard."
                  : "Aucune tâche terminée récemment."
            }
          />
        )}
      </div>

      {showCreate ? (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function UpcomingGroups({ tasks }: { tasks: DailyTask[] }) {
  const groups = new Map<string, DailyTask[]>();
  for (const t of tasks) {
    const key = t.due_date;
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([date, items]) => (
        <div key={date}>
          <p className="mb-2 text-xs font-medium capitalize text-[#8b869c]">{fmtDay(date)}</p>
          <TodayTaskList tasks={items} />
        </div>
      ))}
    </div>
  );
}

function CreateTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<TaskKind>("custom");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, due_date: dueDate, task_kind: kind }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onClose} />
      <form onSubmit={submit} className={`${ui.modal} max-w-md p-6`}>
        <h2 className="text-lg font-semibold text-[#f3f0fa]">Nouvelle tâche</h2>
        <div className="mt-5 space-y-3">
          <div>
            <label className={ui.label}>Titre</label>
            <input
              className={ui.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Appeler, préparer, relancer…"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ui.label}>Date</label>
              <input
                type="date"
                className={ui.input}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className={ui.label}>Catégorie</label>
              <select
                className={ui.input}
                value={kind}
                onChange={(e) => setKind(e.target.value as TaskKind)}
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={loading}>
            {loading ? "Création…" : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  );
}
