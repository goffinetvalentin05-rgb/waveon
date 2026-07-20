"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DailyTask } from "@/lib/crm/types";

export function TodayTaskList({
  tasks,
  emptyLabel = "Rien à faire pour aujourd'hui. Belle journée.",
}: {
  tasks: DailyTask[];
  emptyLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(tasks);

  const toggle = (id: string, completed: boolean) => {
    setLocal((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed } : t))
    );
    startTransition(async () => {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      router.refresh();
    });
  };

  if (!local.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[#e8eef6] bg-white/60 px-5 py-10 text-center text-sm text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {local.map((task) => {
        const kindClass =
          task.task_kind === "demo"
            ? "crm-prio-demo"
            : task.task_kind === "first_contact"
              ? "crm-prio-contact"
              : "crm-prio-follow";

        return (
          <li
            key={task.id}
            className={`flex items-center gap-3 rounded-2xl border border-[#e8eef6] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition ${
              task.completed ? "opacity-55" : ""
            }`}
          >
            <button
              type="button"
              disabled={pending}
              onClick={() => toggle(task.id, !task.completed)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                task.completed
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 hover:border-blue-400"
              }`}
              aria-label={task.completed ? "Décocher" : "Cocher"}
            >
              {task.completed ? (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </button>
            <span className={`text-lg leading-none ${kindClass}`}>●</span>
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-medium text-slate-800 ${
                  task.completed ? "line-through" : ""
                }`}
              >
                {task.title}
              </p>
              {task.prospect ? (
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-blue-600"
                  onClick={() => router.push(`/prospects/${task.prospect!.id}`)}
                >
                  {task.prospect.club_name}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
