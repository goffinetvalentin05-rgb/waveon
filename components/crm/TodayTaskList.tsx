"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { DailyTask } from "@/lib/crm/types";

const KIND_LABEL: Record<string, string> = {
  follow_up: "Relance",
  first_contact: "Contact",
  demo: "Démo",
  custom: "Perso",
};

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

  useEffect(() => {
    setLocal(tasks);
  }, [tasks]);

  const toggle = (id: string, completed: boolean) => {
    setLocal((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
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
      <p className="rounded-[12px] border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-[#6b7d76]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {local.map((task) => {
        const kindClass =
          task.task_kind === "demo"
            ? "bg-emerald-400"
            : task.task_kind === "first_contact"
              ? "bg-amber-400"
              : task.task_kind === "follow_up"
                ? "bg-rose-400"
                : "bg-emerald-400";

        return (
          <li
            key={task.id}
            className={`flex items-center gap-3 rounded-[12px] px-2 py-2 transition hover:bg-white/[0.03] ${
              task.completed ? "opacity-50" : ""
            }`}
          >
            <button
              type="button"
              disabled={pending}
              onClick={() => toggle(task.id, !task.completed)}
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition ${
                task.completed
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-white/20 hover:border-emerald-400"
              }`}
              aria-label={task.completed ? "Décocher" : "Cocher"}
            >
              {task.completed ? (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </button>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${kindClass}`} />
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-medium text-[#eef6f2] ${
                  task.completed ? "line-through" : ""
                }`}
              >
                {task.title}
              </p>
              <div className="flex items-center gap-2">
                {task.prospect ? (
                  <button
                    type="button"
                    className="text-[11px] text-[#6b7d76] hover:text-emerald-300"
                    onClick={() => router.push(`/crm/prospects/${task.prospect!.id}`)}
                  >
                    {task.prospect.club_name}
                  </button>
                ) : (
                  <span className="text-[11px] text-[#6b7d76]">
                    {KIND_LABEL[task.task_kind] ?? "Tâche"}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
