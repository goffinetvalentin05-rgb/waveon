"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/design/tokens";

type Member = {
  user_id: string;
  name: string;
};

export function AssigneeMemberSelect({
  projectId,
  value,
  onChange,
  disabled,
  className,
}: {
  projectId: string | null | undefined;
  value: string | null | undefined;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selfId, setSelfId] = useState("");

  useEffect(() => {
    if (!projectId || projectId === "unassigned") {
      setMembers([]);
      return;
    }
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

  if (!projectId || projectId === "unassigned") {
    return (
      <p className="text-sm text-wo-muted">Attribuez d’abord le prospect à un projet.</p>
    );
  }

  const ordered = [
    ...members.filter((m) => m.user_id === selfId),
    ...members.filter((m) => m.user_id !== selfId),
  ];

  return (
    <select
      className={className ?? `${ui.input} mt-1`}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Non attribué</option>
      {ordered.map((m) => (
        <option key={m.user_id} value={m.user_id}>
          {m.user_id === selfId ? `Moi · ${m.name}` : m.name}
        </option>
      ))}
    </select>
  );
}
