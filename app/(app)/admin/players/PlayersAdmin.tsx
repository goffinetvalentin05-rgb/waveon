"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

type Player = {
  id: string;
  full_name: string;
  position: string | null;
  goals_scored: number;
  team: { id: string; name: string | null } | null;
};

export function PlayersAdmin({
  players,
  teams,
}: {
  players: Player[];
  teams: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: name.trim(), teamId: teamId || null }),
    });
    setName("");
    setTeamId("");
    setSubmitting(false);
    router.refresh();
  };

  const updateGoals = async (id: string, value: number) => {
    await fetch(`/api/admin/players/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalsScored: value }),
    });
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce joueur ?")) return;
    await fetch(`/api/admin/players/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className={ui.input}
          placeholder="Prénom Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select className={ui.input} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">— Équipe —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button type="submit" disabled={submitting} className={ui.btnPrimary}>
          {submitting ? "…" : "Ajouter"}
        </button>
      </form>
      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
          >
            <div>
              <div className="text-sm font-semibold text-white">{p.full_name}</div>
              <div className="text-[11px] text-white/45">{p.team?.name ?? "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                defaultValue={p.goals_scored}
                className={`${ui.input} w-20`}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v !== p.goals_scored) updateGoals(p.id, v);
                }}
              />
              <span className="text-xs text-white/40">buts</span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
              >
                Suppr.
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
