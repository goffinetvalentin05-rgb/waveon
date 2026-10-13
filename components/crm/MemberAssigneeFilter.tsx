"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconUser } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";

type Member = {
  user_id: string;
  name: string;
};

export function MemberAssigneeFilter({
  projectId,
  currentUserId,
  value,
  onChange,
}: {
  projectId: string;
  currentUserId?: string | null;
  value: string;
  onChange: (assigned: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selfId, setSelfId] = useState(currentUserId ?? "");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId || projectId === "unassigned") return;
    void fetch(`/api/projects/${projectId}/members`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.members)) {
          setMembers(
            data.members.map((m: { user_id: string; name: string }) => ({
              user_id: m.user_id,
              name: m.name,
            }))
          );
        }
        if (typeof data.currentUserId === "string") setSelfId(data.currentUserId);
      })
      .catch(() => null);
  }, [projectId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const others = members.filter((m) => m.user_id !== selfId);

  const label = (() => {
    if (!value) return "Tous les prospects";
    if (value === "me") return "Mes prospects";
    if (value === "unassigned") return "Non attribués";
    const m = members.find((x) => x.user_id === value);
    return m ? m.name : "Par membre";
  })();

  const select = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`${ui.btnSecondary} min-w-[10.5rem] justify-between`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 truncate">
          <IconUser className="h-4 w-4 shrink-0 text-wo-accent" stroke={1.75} />
          <span className="truncate">{label}</span>
        </span>
        <IconChevronDown className="h-4 w-4 shrink-0 opacity-70" stroke={1.75} />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-wo-border bg-[#15110E] py-1 shadow-xl">
          <button
            type="button"
            className={`flex w-full px-3 py-2 text-left text-[13px] transition hover:bg-white/[0.04] ${
              !value ? "text-wo-accent" : "text-wo-text"
            }`}
            onClick={() => select("")}
          >
            Tous les prospects
          </button>
          <div className="my-1 border-t border-wo-border" />
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-wo-dim">
            Par membre
          </p>
          <button
            type="button"
            className={`flex w-full px-3 py-2 text-left text-[13px] transition hover:bg-white/[0.04] ${
              value === "me" ? "text-wo-accent" : "text-wo-text"
            }`}
            onClick={() => select("me")}
          >
            Mes prospects
          </button>
          {others.map((m) => (
            <button
              key={m.user_id}
              type="button"
              className={`flex w-full px-3 py-2 text-left text-[13px] transition hover:bg-white/[0.04] ${
                value === m.user_id ? "text-wo-accent" : "text-wo-text"
              }`}
              onClick={() => select(m.user_id)}
            >
              {m.name}
            </button>
          ))}
          <div className="my-1 border-t border-wo-border" />
          <button
            type="button"
            className={`flex w-full px-3 py-2 text-left text-[13px] transition hover:bg-white/[0.04] ${
              value === "unassigned" ? "text-wo-accent" : "text-wo-text"
            }`}
            onClick={() => select("unassigned")}
          >
            Non attribués
          </button>
        </div>
      ) : null}
    </div>
  );
}
